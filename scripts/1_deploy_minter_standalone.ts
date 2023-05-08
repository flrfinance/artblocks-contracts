import hre from "hardhat";
import { ethers } from "hardhat";

import { AdminACLV1__factory } from "./contracts/factories/AdminACLV1__factory";
import { GenArt721CoreV3__factory } from "./contracts/factories/GenArt721CoreV3__factory";
import { MinterFilterV1__factory } from "./contracts/factories/MinterFilterV1__factory";
import { MinterDALinV4__factory } from "./contracts/factories/MinterDALinV4__factory";
import { BasicRandomizerV2__factory } from "./contracts/factories/BasicRandomizerV2__factory";
import { BytecodeStorageReader__factory } from "./contracts/factories/BytecodeStorageReader__factory";

async function main() {
  const [deployer] = await ethers.getSigners();

  const randomizer__f = (await ethers.getContractFactory(
    "BasicRandomizerV2"
  )) as BasicRandomizerV2__factory;
  const randomizer = await randomizer__f.deploy();
  await randomizer.deployed();
  console.log(`Randomizer deployed at ${randomizer.address}`);

  const adminACL__f = (await ethers.getContractFactory(
    "AdminACLV1"
  )) as AdminACLV1__factory;
  const adminACL = await adminACL__f.deploy();
  await adminACL.deployed();
  console.log(`AdminACL deployed at ${adminACL.address}`);

  const bytecodeLib__f = (await ethers.getContractFactory(
    "BytecodeStorageReader"
  )) as BytecodeStorageReader__factory;
  const bytecodeLib = await bytecodeLib__f.deploy();
  await bytecodeLib.deployed();
  console.log(`BytecodeStorageReader deployed at ${bytecodeLib.address}`);

  const genArt721Core = (await ethers.getContractFactory("GenArt721CoreV3", {
    libraries: {
      BytecodeStorageReader: bytecodeLib.address,
    },
  })) as GenArt721CoreV3__factory;
  const genArt721CoreContract = await genArt721Core.deploy(
    "Random Bullshit Go",
    "RBG",
    randomizer.address,
    adminACL.address,
    2
  );
  const genArt721CoreContract__D = await genArt721CoreContract.deployed();
  console.log(`GenArt721CoreV3 deployed at ${genArt721CoreContract.address}`);

  const minterFilter__f = (await ethers.getContractFactory(
    "MinterFilterV1"
  )) as MinterFilterV1__factory;
  const minterFilter = await minterFilter__f.deploy(
    genArt721CoreContract.address
  );
  await minterFilter.deployed();
  console.log(`MinterFilterV1 deployed at ${minterFilter.address}`);

  const minter = (await ethers.getContractFactory(
    "MinterDALinV4"
  )) as MinterDALinV4__factory;
  const minterContract = await minter.deploy(
    genArt721CoreContract.address,
    minterFilter.address
  );
  const auction = await minterContract.deployed();
  console.log(`MinterDALinV4 deployed at ${minterContract.address}`);

  console.log("Now let's play");

  const recp = await (
    await genArt721CoreContract__D["addProject(string,address)"](
      "Random Bullshit Go",
      deployer.address
    )
  ).wait();

  const projecId = recp.events?.find((e) => e.event == "ProjectUpdated")?.args
    ?._projectId;

  console.log(`Project added ${projecId}`);

  const start = Math.floor(Date.now() / 1000) + 1000;

  await (
    await auction
      .connect(deployer)
      .setAuctionDetails(
        projecId,
        start,
        start + 10000,
        "100000000000000000",
        "10000000000000000"
      )
  ).wait();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
