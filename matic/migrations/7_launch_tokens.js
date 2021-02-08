const WildcardSteward_v3 = artifacts.require("WildcardSteward_v3_matic");
const WildcardSteward_matic_v1 = artifacts.require("WildcardSteward_matic_v1");
const ERC721Patronage_v1 = artifacts.require("ERC721Patronage_v1");
const Dai = artifacts.require("./DaiMatic.sol");

const { ether } = require("@openzeppelin/test-helpers");
const { daiPermitGeneration } = require("../test/helpers");

const testAccountAddress = "0x8c7A88756EbbF46Ede65E4D678359cAC5f08f7b2";

const twentyPercentMonthlyHarbergerTax = "240" + "0000000000"; // Harberger tax rate of 240% per year

let mareCetAddress = "0x707c0041f6e87411812f9e98fd99c9eddfd0b2a0";
let lionLandscapes = "0x2b48B87B7d168D0a8b7e1526ff90e10876E46067";
let zavoraLabAddress = "0x16Aa1E035AAffF67ED35bf7BC00070d8a88ee3C1";
let oceansResearchAddres = "0x0633de7c301f6e350db531c5f95a4500d9373c51";
let sasharkconservancy = "0x102B9d763d502EE4E86A74277E6C251bD6759FE1";
let sharkspotters = "0x603192ABB2E402202D3d88F000427a43C51eD79A";
let southrupuniconservation = "0xbd7b4286602145ccd122d5cd6bf6e9d61af17c48";
let easternghatsws = "0x24A784BeB57385Ed37d3020Cc5a310E287AaD28E";
let endangeredwildlife = "0xA7Cb48CB98fE1a8CFF4A6e4C6EEF8b4bcAe0C1cC";
let oana = "0x6dB803540E20E16b7355bC4d4dA33c46b76DC2FA";
let bios = "0x05b71fE3f642d18A7034818C6085e15A5Ed26699";
const bdiAddress = "0xADad0D21ba0E4b356e2b2769e08CfeF206f83891";

const fishcatAddress = "0xbc2c67a59ec004d7127a63f0f99275e31b4883cf";
const mountKenyaTrust = "";
const tsavoTrust = "0xb13Ad3f90722Dae0f9C1c7b4deF7bbAa6b68e4Be";

const fynbosLife = "0xcaFA650A4e133228f6CcE8f0674A81057EdADFEe";

let civit = "0x8846e72803d0CeCaeeaC329ec0d566Fbefa056f3";
let creatifa = "0x9894d59d59e90eb82f74eec4dca2d7bd2754e5cb";
let yuhlets = "0x6555f8fb6a02c9c73d55c72959a9e0cebff13489";
let oficinastk = "0xa4aD045d62a493f0ED883b413866448AfB13087C";
let ktwentymanjones = "0x5f68c84Cc626E70eAE9707a3a352394136D9638e";
let kbo_metaverse = "0x015dA446370a4791A95227777F8DF841F7040d7d";
let deemerman = "0x595Da8DED6019715E143824Ef901864cE35167FA";
const oculardelusion = "0xbc2c67a59ec004d7127a63f0f99275e31b4883cf";
const coyotlcompany = "0x65D472172E4933aa4Ddb995CF4Ca8bef72a46576";
const connorg_art = "0x7078f4Ac06393093BCBf6920A8BD3d202fdfd08B";
const cryptocromo = "0x981276d81272f7CD8808701645741db1abaCad56";
const adaPainter = "0xdcdfdCfE8044a8D373260dA3fe45e71a0Af5ef77";

const monday18Jan2020 = 1610996400;
const twoDaysInSeconds = 172800;

const buyAuctionPermit = async (
  provider,
  steward,
  daiContract,
  account,
  tokenId,
  tokenPrice,
  depositAmount
) => {
  let { nonce, expiry, v, r, s } = await daiPermitGeneration(
    provider,
    daiContract,
    account,
    steward.address
  );
  console.log("ACCOUNT", account);
  console.log("PERMIT", { nonce, expiry, v, r, s });

  await steward.buyAuctionWithPermit(
    // uint256 nonce,
    nonce,
    // uint256 expiry,
    expiry,
    // bool allowed,
    true,
    // uint8 v,
    v,
    // bytes32 r,
    r,
    // bytes32 s,
    s,
    // uint256 tokenId,
    tokenId,
    // uint256 _newPrice,
    tokenPrice,
    // uint256 serviceProviderPercentage,
    50000,
    // uint256 depositAmount
    depositAmount,
    {
      from: account,
    }
  );
  console.log("after the buy auction");
};
module.exports = function(deployer, networkName, accounts) {
  deployer.then(async () => {
    // Don't try to deploy/migrate the contracts for tests
    if (networkName === "test") {
      return;
    }

    const stewardAddress = (await WildcardSteward_v3.deployed()).address;
    const steward = await WildcardSteward_matic_v1.at(stewardAddress);
    const patronageToken = await ERC721Patronage_v1.deployed();

    const isMinter = await patronageToken.isMinter(steward.address);
    console.log("steward address After", steward.address);

    console.log("IS MINTER?", isMinter);
    console.log("before minting");

    await steward.listNewTokens(
      [
        "40",
        //     80,
        "41",
        //     53,
        "43",
        //     78,
        "44",
        //     69,
        "45",
        //     46,
        "46",
        //     42,
        "47",
        //     74,
        "48",
        //     50,
        "49",
        //     79,
        "50",
        //     75,
        "51",
        //     67,
        "52",
        //     38,
        "53",
        //     54,
        //     63,
        //     65,
      ],
      [
        fishcatAddress,
        southrupuniconservation,
        easternghatsws,
        sasharkconservancy,
        sharkspotters,
        lionLandscapes,
        sasharkconservancy,
        oceansResearchAddres,
        easternghatsws,
        sasharkconservancy,
        tsavoTrust,
        sasharkconservancy,
        southrupuniconservation,
      ],
      [
        twentyPercentMonthlyHarbergerTax,
        twentyPercentMonthlyHarbergerTax,
        twentyPercentMonthlyHarbergerTax,
        twentyPercentMonthlyHarbergerTax,
        twentyPercentMonthlyHarbergerTax,
        twentyPercentMonthlyHarbergerTax,
        twentyPercentMonthlyHarbergerTax,
        twentyPercentMonthlyHarbergerTax,
        twentyPercentMonthlyHarbergerTax,
        twentyPercentMonthlyHarbergerTax,
        twentyPercentMonthlyHarbergerTax,
        twentyPercentMonthlyHarbergerTax,
        twentyPercentMonthlyHarbergerTax,
      ],
      [
        oculardelusion,
        adaPainter,
        coyotlcompany,
        ktwentymanjones,
        ktwentymanjones,
        ktwentymanjones,
        ktwentymanjones,
        ktwentymanjones,
        ktwentymanjones,
        ktwentymanjones,
        ktwentymanjones,
        ktwentymanjones,
        ktwentymanjones,
      ],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [
        monday18Jan2020,
        monday18Jan2020 + twoDaysInSeconds,
        monday18Jan2020 + twoDaysInSeconds * 2,
        monday18Jan2020 + twoDaysInSeconds * 3,
        monday18Jan2020 + twoDaysInSeconds * 4,
        monday18Jan2020 + twoDaysInSeconds * 5,
        monday18Jan2020 + twoDaysInSeconds * 6,
        monday18Jan2020 + twoDaysInSeconds * 7,
        monday18Jan2020 + twoDaysInSeconds * 8,
        monday18Jan2020 + twoDaysInSeconds * 9,
        monday18Jan2020 + twoDaysInSeconds * 11,
        monday18Jan2020 + twoDaysInSeconds * 13,
        monday18Jan2020 + twoDaysInSeconds * 15,
      ],
      { from: accounts[0] }
    );
    console.log("After minting");

    await Promise.all([
      steward.setArtistCommissionOnNextSale("40", 500000),
      steward.setArtistCommissionOnNextSale("41", 500000),
      steward.setArtistCommissionOnNextSale("43", 500000),
      steward.setArtistCommissionOnNextSale("44", 500000),
      steward.setArtistCommissionOnNextSale("45", 500000),
      steward.setArtistCommissionOnNextSale("46", 500000),
      steward.setArtistCommissionOnNextSale("47", 500000),
      steward.setArtistCommissionOnNextSale("48", 500000),
      steward.setArtistCommissionOnNextSale("49", 500000),
      steward.setArtistCommissionOnNextSale("50", 500000),
      steward.setArtistCommissionOnNextSale("51", 500000),
      steward.setArtistCommissionOnNextSale("52", 500000),
      steward.setArtistCommissionOnNextSale("53", 500000),
    ]);

    console.log("artist amounts");
  });
};