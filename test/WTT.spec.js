const {
  BN,
  constants,
  expectEvent,
} = require('@openzeppelin/test-helpers')
const { expect } = require('chai')

const WTT = artifacts.require('WTT')

contract('WTT', ([deployer, abby, bena, chris, dora, evie]) => {
  beforeEach(async () => {
    const wTT = this.wTT = await WTT.new()
    this.client = new web3.eth.Contract(wTT.abi, wTT.address)
  })

  describe('Wallet <=> WTT', () => {
    it('token base info', async () => {
      expect(await this.client.methods.name().call()).to.equal('Wrapped Thunder Token')
      expect(await this.client.methods.symbol().call()).to.equal('WTT')
      expect(await this.client.methods.decimals().call()).is.a.bignumber.that.eq('18')
      expect(await this.client.methods.totalSupply().call()).is.a.bignumber.that.eq('0')
    })

    it('deposit & withdraw', async () => {
      const balance = new BN(await web3.eth.getBalance(dora))

      expect(await this.wTT.balanceOf(dora)).is.a.bignumber.that.eq('0')
      const deposited = new BN(web3.utils.toWei('3.14'))

      expectEvent(await this.client.methods.deposit().send({
        from: dora,
        value: deposited,
      }), 'Deposit', {
        dst: dora,
        wad: deposited,
      })

      expect(await this.client.methods.balanceOf(dora).call()).is.a.bignumber.that.eq(deposited)

      const withdrawed = new BN(web3.utils.toWei('1.618'))
      expectEvent(await this.client.methods.withdraw(withdrawed).send({ from: dora }), 'Withdrawal', {
        src: dora,
        wad: withdrawed,
      })

      expect(await this.client.methods.totalSupply().call()).is.a.bignumber.that.eq(deposited.sub(withdrawed))
      expect(new BN(await web3.eth.getBalance(this.wTT.address))).is.a.bignumber.eq(deposited.sub(withdrawed))
      expect(new BN(await web3.eth.getBalance(dora))).is.a.bignumber.that.closeTo(
        balance.sub(deposited).add(withdrawed),
        new BN(web3.utils.toWei('0.01')) // gas fee
      )
    })

    it('approve & transfer', async () => {
      await this.client.methods.deposit().send({
        from: chris,
        value: new BN(await web3.eth.getBalance(chris)).sub(new BN(web3.utils.toWei('0.1'))),
      })
      const balance = new BN(await this.client.methods.balanceOf(chris).call())

      expectEvent(await this.client.methods.approve(evie, constants.MAX_UINT256).send({ from: chris }), 'Approval', {
        src: chris,
        guy: evie,
        wad: constants.MAX_UINT256,
      })

      const approved = new BN(web3.utils.toWei('0.330366'))
      expectEvent(await this.client.methods.approve(bena, approved).send({ from: chris }), 'Approval', {
        src: chris,
        guy: bena,
        wad: approved,
      })

      const amount = new BN(web3.utils.toWei('0.110001'))
      expectEvent(await this.client.methods.transfer(dora, amount).send({ from: chris }), 'Transfer', {
        src: chris,
        dst: dora,
        wad: amount,
      })
      expectEvent(await this.client.methods.transferFrom(chris, dora, amount).send({ from: bena }), 'Transfer', {
        src: chris,
        dst: dora,
        wad: amount,
      })
      expectEvent(await this.client.methods.transferFrom(chris, dora, amount).send({ from: evie }), 'Transfer', {
        src: chris,
        dst: dora,
        wad: amount,
      })

      expect(await this.client.methods.balanceOf(dora).call()).is.a.bignumber.eq(amount.mul(new BN(3)))
      expect(await this.client.methods.balanceOf(chris).call())
        .is.a.bignumber.eq(balance.sub(amount.mul(new BN(3))))
      expect(await this.client.methods.allowance(chris, bena).call())
        .is.a.bignumber.eq(approved.sub(amount), 'Allowance shall decrease spending amounts')
      expect(await this.client.methods.allowance(chris, evie).call())
        .is.a.bignumber.eq(constants.MAX_UINT256, 'Allowance shall not decrease after spending if approved max')
    })

    it('send tt to contract should act same as deposit', async () => {
      const sendAmount = new BN(web3.utils.toWei('2.718'))
      await web3.eth.sendTransaction({ from: abby, to: this.wTT.address, value: sendAmount })
      expect(await this.client.methods.balanceOf(abby).call()).is.a.bignumber.that.eq(sendAmount)
    })
  })

  describe('Contract <=> WTT', () => {
    it('wrap & unwrap', async () => {
      const other = await artifacts.require('FakeThirdParty').new(this.wTT.address)
      const input = new BN(web3.utils.toWei('17'))
      await other.doSomethingAfterWrap({ from: deployer, value: input })
      expect(await other.records(deployer)).is.a.bignumber.that.eq(input)
      expect(await this.wTT.balanceOf(other.address)).is.a.bignumber.that.eq(input)

      const balance = new BN(await web3.eth.getBalance(deployer))
      const output = new BN(web3.utils.toWei('6'))
      expectEvent(await other.unwrapBeforeDoSomething(output), 'Unwrapped', {
        amount: output,
      })

      expect(await other.records(deployer)).is.a.bignumber.that.eq(input.sub(output))
      expect(await this.wTT.balanceOf(other.address)).is.a.bignumber.that.eq(input.sub(output))
      expect(new BN(await web3.eth.getBalance(deployer))).is.a.bignumber.closeTo(
        balance.add(output),
        new BN(web3.utils.toWei('0.01')) // gas fee
      )
    })
  })
})
