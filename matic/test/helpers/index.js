const { BN } = require("@openzeppelin/test-helpers");
const { time, ether } = require("@openzeppelin/test-helpers");

const { promisify } = require("util");
const { signDaiPermit } = require("eth-permit");
const sigUtils = require("eth-sig-util");
const ethUtils = require("ethereumjs-util");

const NUM_SECONDS_IN_YEAR = "31536000";
const STEWARD_CONTRACT_NAME = "./WildcardSteward_matic_v2.sol";
const ERC721_CONTRACT_NAME = "./ERC721Patronage_v1.sol";
const ERC20_CONTRACT_NAME = "./ERC20PatronageReceipt_v2_upgradable.sol";
const MINT_MANAGER_CONTRACT_NAME = "./MintManager_v2.sol";
const SENT_ATTACKER_CONTRACT_NAME = "./tests/SendBlockAttacker.sol";
const abi = require("ethereumjs-abi");
const ethUtil = require("ethereumjs-util");
const globalTokenGenerationRate = 11574074074074;

const ERC721token = artifacts.require(ERC721_CONTRACT_NAME);
const WildcardSteward = artifacts.require(STEWARD_CONTRACT_NAME);
const ERC20token = artifacts.require(ERC20_CONTRACT_NAME);
const MintManager = artifacts.require(MINT_MANAGER_CONTRACT_NAME);
const DaiMatic = artifacts.require("./DaiMatic.sol");

const launchTokens = async (steward, tokenParameters) => {
  return await steward.listNewTokens(
    tokenParameters.map((item) => item.token),
    tokenParameters.map((item) => item.benefactor),
    tokenParameters.map((item) => item.patronageNumerator),
    tokenParameters.map((item) => item.artist),
    tokenParameters.map((item) => item.artistCommission),
    tokenParameters.map((item) => item.releaseDate)
  );
};

const initialize = async (
  admin,
  withdrawCheckerAdmin,
  auctionStartPrice,
  auctionEndPrice,
  auctionLength,
  tokenParameters,
  accountsToMintPaymentTokensFor = [],
  approveDaiMatic = true
) => {
  const erc721 = await ERC721token.new({ from: admin });
  const steward = await WildcardSteward.new({ from: admin });
  const mintManager = await MintManager.new({ from: admin });
  const erc20 = await ERC20token.new({
    from: admin,
  });
  await erc20.setup(
    "Wildcards Loyalty Token",
    "WLT",
    mintManager.address,
    admin,
    admin /* Just use the admin as the 'childChainManager' */
  );
  // const networkId = 31337; // This is the default networkId used by buidler - BE CAREFUL, might cause issues with other test runners?
  const paymentToken = await DaiMatic.new({
    from: admin,
  });
  await paymentToken.initialize("(PoS) Dai Stablecoin", "DAI", 18, admin);
  await mintManager.initialize(admin, steward.address, erc20.address, {
    from: admin,
  });
  await erc20.addMinter(mintManager.address, {
    from: admin,
  });
  await erc20.renounceMinter({ from: admin });
  await erc721.setup(
    steward.address,
    "ALWAYSFORSALETestToken",
    "AFSTT",
    steward.address,
    admin,
    { from: admin }
  );
  await Promise.all(
    accountsToMintPaymentTokensFor.map(async (account) => {
      await paymentToken.mint(account, ether("100"));
      if (approveDaiMatic) {
        await paymentToken.approve(steward.address, ether("50"), {
          from: account,
        });
      }
    })
  );
  // await erc721.addMinter(steward.address, { from: admin });
  // await erc721.renounceMinter({ from: admin });
  // TODO: use this to make the contract address of the token deturministic: https://ethereum.stackexchange.com/a/46960/4642
  // address _assetToken,
  // address _admin,
  // address _mintManager,
  // address _withdrawCheckerAdmin,
  // uint256 _auctionStartPrice,
  // uint256 _auctionEndPrice,
  // uint256 _auctionLength
  await steward.initialize(
    erc721.address,
    admin,
    mintManager.address,
    withdrawCheckerAdmin,
    auctionStartPrice,
    auctionEndPrice,
    auctionLength,
    paymentToken.address
  );

  await launchTokens(steward, tokenParameters);

  return {
    erc721,
    steward,
    mintManager,
    erc20,
    paymentToken,
  };
};

const isCoverage = process.env.IS_COVERAGE == "true";

// NOTE:: This was inspired by this question and the off by one second errors I was getting:
// https://ethereum.stackexchange.com/a/74558/4642
const waitTillBeginningOfSecond = () =>
  new Promise((resolve) => {
    const timeTilNextSecond = 1000 - new Date().getMilliseconds();
    setTimeout(resolve, timeTilNextSecond);
  });

const setupTimeManager = async (web3) => {
  const getCurrentTimestamp = async () => {
    return new BN(
      (await web3.eth.getBlock(await web3.eth.getBlockNumber())).timestamp
    );
  };
  const txTimestamp = async (transaction) => {
    const tx = await transaction;
    return new BN((await web3.eth.getBlock(tx.receipt.blockNumber)).timestamp);
  };
  const timeSince = (timestampInThePast, tillTimestamp) => {
    const timeSince = tillTimestamp.sub(timestampInThePast);
    return timeSince;
  };
  const timeSinceTimestamp = async (timestampInThePast) => {
    return timeSince(timestampInThePast, await getCurrentTimestamp());
  };
  const setNextTxTimestamp = async (timeIncrease) => {
    const timeIncreaseBN = new BN(timeIncrease);
    if (timeIncreaseBN.lt(new BN("1"))) {
      throw "timeIncrease must be positive";
    }
    const timestamp = parseInt(
      (await getCurrentTimestamp()).add(timeIncreaseBN).toString()
    );

    if (isCoverage) {
      await time.increase(timeIncreaseBN);
      // await time.increase(timeIncreaseBN.add(new BN(1)));
    } else {
      await promisify(web3.currentProvider.send.bind(web3.currentProvider))({
        jsonrpc: "2.0",
        method: "evm_setNextBlockTimestamp",
        params: [timestamp],
      });
    }

    return new BN(timestamp);
  };

  return {
    setNextTxTimestamp,
    timeSinceTimestamp,
    timeSince,
    getCurrentTimestamp,
    txTimestamp,
  };
};

const withdrawBenefactorFundsAll = async (
  steward,
  web3,
  withdrawCheckerAdmin,
  benefactor,
  maxAmount,
  expiry,
  from
) => {
  const randomNonce = Math.floor(Math.random() * 10000000);
  const hash =
    "0x" +
    abi
      .soliditySHA3(
        ["address", "uint256", "uint256", "uint256"],
        [benefactor, maxAmount, expiry, randomNonce]
      )
      .toString("hex");

  const signature = await web3.eth.sign(hash, withdrawCheckerAdmin);

  const { r, s, v } = ethUtil.fromRpcSig(signature);
  // NOTE: The below 3 lines do the same thing as the above line, kept for reference.
  // const r = signature.slice(0, 66);
  // const s = "0x" + signature.slice(66, 130);
  // const v = web3.utils.toDecimal("0x" + signature.slice(130, 132));

  // this prefix is required by the `ecrecover` builtin solidity function (other than that it is pretty arbitrary)
  const prefix = "\x19Ethereum Signed Message:\n32";
  const prefixedBytes = web3.utils.fromAscii(prefix) + hash.slice(2);
  const prefixedHash = web3.utils.sha3(prefixedBytes, { encoding: "hex" });

  // // For reforence, how to recover a signature with javascript.
  // const recoveredPub = ethUtil.ecrecover(
  //   ethUtil.toBuffer(prefixedHash),
  //   sigDecoded.v,
  //   sigDecoded.r,
  //   sigDecoded.s
  // );
  // const recoveredAddress = ethUtil.pubToAddress(recoveredPub).toString("hex");
  return await steward.withdrawBenefactorFundsToValidated(
    benefactor,
    maxAmount,
    expiry,
    randomNonce,
    prefixedHash,
    v,
    r,
    s,
    {
      from: from || benefactor,
      gasPrice: "0", // Set gas price to 0 for simplicity
    }
  );
};

const getTypedData = ({
  name,
  version,
  chainId,
  verifyingContract,
  nonce,
  holder,
  spender,
  expiry,
  allowed,
}) => {
  return {
    types: {
      EIP712Domain: [
        {
          name: "name",
          type: "string",
        },
        {
          name: "version",
          type: "string",
        },
        {
          name: "verifyingContract",
          type: "address",
        },
        {
          name: "salt",
          type: "bytes32",
        },
      ],
      Permit: [
        {
          name: "holder",
          type: "address",
        },
        {
          name: "spender",
          type: "address",
        },
        {
          name: "nonce",
          type: "uint256",
        },
        {
          name: "expiry",
          type: "uint256",
        },
        {
          name: "allowed",
          type: "bool",
        },
      ],
    },
    domain: {
      name,
      version,
      verifyingContract,
      salt: "0x" + chainId.toString(16).padStart(64, "0"),
    },
    primaryType: "Permit",
    message: {
      holder,
      spender,
      nonce,
      expiry: expiry || 0,
      allowed,
    },
  };
};
const getSignatureParameters = (signature) => {
  const r = signature.slice(0, 66);
  const s = "0x".concat(signature.slice(66, 130));
  const _v = "0x".concat(signature.slice(130, 132));
  let v = parseInt(_v);
  if (![27, 28].includes(v)) v += 27;
  return { r, s, v };
};

const daiPermitGeneration = async (
  provider,
  daiContract,
  holder,
  spender,
  // nonce,
  expiry = 0
) => {
  const name = await daiContract.name();
  const chainId = await daiContract.getChainId();
  const nonce = await daiContract.getNonce(holder);

  let params = {
    name,
    version: "1",
    chainId: chainId,
    verifyingContract: daiContract.address,
    nonce: "0x" + nonce.toString(16),
    holder,
    spender,
    expiry: expiry,
    allowed: true,
  };

  let typedData = getTypedData(params);

  // // NOTE: below is an alternative method to generate the signature - but requires the private key.
  // const sig = sigUtils.signTypedData(
  //   ethUtils.toBuffer(
  //     "PUT PRIVATE KEY STRING HERE"
  //     // "0xb5546e25f9324e63ef077e2ce63ccdc54b4d84b1866c5606945c3039580bdf47"
  //   ),
  //   {
  //     data: typedData,
  //   }
  // );

  let from = holder;
  return new Promise((res, rej) => {
    provider.send(
      // provider.sendAsync(
      {
        // method: "eth_signTypedData_v3",
        method: "eth_signTypedData",
        params: [from, typedData],
        from,
      },
      async (e, r) => {
        if (e) {
          rej(e);
        }
        const sig = r.result;
        res({ nonce, expiry, ...getSignatureParameters(sig) });
      }
    );
  });
};

module.exports = {
  STEWARD_CONTRACT_NAME,
  ERC721_CONTRACT_NAME,
  ERC20_CONTRACT_NAME,
  MINT_MANAGER_CONTRACT_NAME,
  SENT_ATTACKER_CONTRACT_NAME,
  setupTimeManager,
  initialize,
  launchTokens,
  withdrawBenefactorFundsAll,
  globalTokenGenerationRate,
  isCoverage,
  waitTillBeginningOfSecond,
  daiPermitGeneration,
  //patronage per token = price * amountOfTime * patronageNumerator/ patronageDenominator / 365 days;
  multiPatronageCalculator: () => (timeInSeconds, tokenArray) => {
    const totalPatronage = tokenArray.reduce(
      (totalPatronage, token) =>
        totalPatronage.add(
          new BN(token.price)
            .mul(new BN(timeInSeconds))
            .mul(new BN(token.patronageNumerator))
            .div(new BN("1000000000000"))
            .div(new BN(NUM_SECONDS_IN_YEAR))
        ),
      new BN("0")
    );
    return totalPatronage;
  },

  patronageDue: (tokenArray) => {
    const totalPatronage = tokenArray.reduce(
      (totalPatronage, token) =>
        totalPatronage.add(
          new BN(token.price)
            .mul(new BN(token.timeHeld))
            .mul(new BN(token.patronageNumerator))
            .div(new BN("31536000000000000000")) // = 1 year * patronageDenominator = 365 days * 1000000000000
        ),
      new BN("0")
    );
    return totalPatronage;
  },

  // startPrice - ( ( (startPrice - endPrice) * howLongThisAuctionBeenGoing ) / auctionLength )
  auctionCalculator: (
    auctionStartPrice,
    auctionEndPrice,
    auctionLength,
    howLongThisAuctionBeenGoing
  ) => {
    let diff = auctionStartPrice.sub(auctionEndPrice);
    return auctionStartPrice.sub(
      diff.mul(new BN(howLongThisAuctionBeenGoing)).div(new BN(auctionLength))
    );
  },

  multiTokenCalculator: (tokenArray) => {
    const totalTokens = tokenArray.reduce(
      (totalTokens, token) =>
        totalTokens.add(
          new BN(token.tokenGenerationRate).mul(new BN(token.timeHeld))
        ),
      new BN("0")
    );
    return totalTokens;
  },
};
