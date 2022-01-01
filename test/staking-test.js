


const { expect } = require('chai')
const { ethers, waffle} = require("hardhat");
const { BigNumber, utils } = ethers;

describe('Token contract', function () {
  let Token
  let token
  let owner
  let addr1
  let addr2
  let addr3
  let Staking
  let staking
  let ownerSigner
  let multiSigW

  beforeEach(async () => {
    ;[owner, addr1, addr2, addr3] = await ethers.getSigners()
    // console.log(addr1)
    // console.log(addr2)
    // console.log(addr3)
    // // Token = await ethers.getContractFactory("Hbar");
    // Staking = await ethers.getContractFactory("Staking");
    // token = await Token.deploy();
    // staking = await Staking.deploy(token.address);
    // await hre.network.provider.request({
    //   method: "hardhat_impersonateAccount",
    //   params: [owner.address]
    // })
    multiSigWallet = await ethers.getContractFactory("MultiSigWallet");
    wallet = await multiSigWallet.deploy(
      [owner.address, addr1.address, addr2.address],
      2
    );
    const provider = waffle.provider;
    await owner.sendTransaction({to: wallet.address, value: ethers.utils.parseEther("10"),});
    expect(ethers.utils.formatEther(await provider.getBalance(wallet.address))).to.equal('10.0');
  })

  describe('Send Ether', function (){

    it('Should create transaction with 0 confirmations.', async function(){
      const bn1eth = BigNumber.from( (1*10**18).toString() );
      await wallet.submitTransaction(addr3.address, bn1eth, 0x0);
      expect(await wallet.getTransactionCount()).to.equal('1');
      const tx = await wallet.transactions(0)
      expect(tx.numConfirmations).to.equal('0');
    })

    it('Should create transaction, 1 address confirm, fail to execute.', async function(){
      const bn1eth = BigNumber.from( (1*10**18).toString() );
      await wallet.submitTransaction(addr3.address, bn1eth, 0x0);
      expect(await wallet.getTransactionCount()).to.equal('1');
      // Just 1 of the owner addresses confirms 
      await wallet.connect(addr1).confirmTransaction(0);
      const tx = await wallet.transactions(0)
      expect(tx.numConfirmations).to.equal('1');
      // transaction should not be executed with only one confirmation.
      await expect(
        wallet.connect(addr1).executeTransaction(0)
      ).to.be.revertedWith("cannot execute tx");
    })

    it('Should create transaction, 2 address confirms, execute successfully.', async function(){
      const bn1eth = BigNumber.from( (1*10**18).toString() );
      await wallet.submitTransaction(addr3.address, bn1eth, 0x0);
      expect(await wallet.getTransactionCount()).to.equal('1');
      // Just 1 of the owner addresses confirms 
      await wallet.connect(addr1).confirmTransaction(0);
      await wallet.connect(addr2).confirmTransaction(0);
      const tx = await wallet.transactions(0);
      expect(tx.numConfirmations).to.equal('2');
      // transaction should not be executed with only one confirmation.
      const initBalanceAddr3 = await waffle.provider.getBalance(addr3.address);
      await wallet.connect(owner).executeTransaction(0);
      const finBalanceAddr3 = await waffle.provider.getBalance(addr3.address);
      expect(ethers.utils.formatEther( finBalanceAddr3.sub(initBalanceAddr3).toString())).to.equal("1.0");    
    })

    it('Should fail if tx has already executed.', async function(){
      const bn1eth = BigNumber.from( (1*10**18).toString() );
      await wallet.submitTransaction(addr3.address, bn1eth, 0x0);
      await wallet.connect(owner).confirmTransaction(0);
      await wallet.connect(addr1).confirmTransaction(0);
      await wallet.connect(owner).executeTransaction(0);
      await expect(
        wallet.connect(addr1).executeTransaction(0)
      ).to.be.revertedWith("tx already executed");
    })
  })
  
})
