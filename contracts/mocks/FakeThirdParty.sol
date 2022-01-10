// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.9;

import { WTT } from '../WTT.sol';

contract FakeThirdParty {
  WTT public wTT;

  mapping(address => uint256) public records;

  event Unwrapped(uint256 amount);
  event Received(address from, uint256 amount);

  constructor(WTT _wTT) {
    wTT = _wTT;
  }


  // Must be a payable contract!
  receive() external payable {
    if (msg.sender == address(wTT)) {
      emit Unwrapped(msg.value);
    } else {
      emit Received(msg.sender, msg.value);

      doSomethingAfterWrap();
    }
  }

  function doSomethingAfterWrap() public payable {
    require(msg.value > 0, 'Send me TT!!');

    uint256 before = wTT.balanceOf(address(this));
    wrap(msg.value);

    // Do something to those wrapped TT (ERC20)

    records[msg.sender] += wTT.balanceOf(address(this)) - before;
  }

  function unwrapBeforeDoSomething(uint256 amount) public {
    require(records[msg.sender] >= amount, 'Too much');

    unwrap(amount);

    // Do something to those unwrapped TT (Native Token)

    records[msg.sender] -= amount;
    payable(msg.sender).transfer(amount);
  }

  function wrap(uint256 amount) internal { wTT.deposit{ value: amount }(); }
  function unwrap(uint256 amount) internal { wTT.withdraw(amount); }
}
