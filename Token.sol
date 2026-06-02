// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract Token {

    string public name = "CampusToken";
    string public symbol = "CTK";
    uint public totalSupply = 1000;

    mapping(address => uint) public balance;

    struct Transaction {
        address from;
        address to;
        uint amount;
        string purpose;
        uint timestamp;
    }

    Transaction[] public transactions;

    // ✅ ADD THIS EVENT
    event TokensSent(
        address from,
        address to,
        uint amount,
        string purpose,
        uint timestamp
    );

    constructor() {
        balance[msg.sender] = totalSupply;
    }

    function transfer(address to, uint amount, string memory purpose) public {

        require(balance[msg.sender] >= amount, "Not enough balance");

        balance[msg.sender] -= amount;
        balance[to] += amount;

        transactions.push(Transaction(
            msg.sender,
            to,
            amount,
            purpose,
            block.timestamp
        ));

        // ✅ EMIT EVENT
        emit TokensSent(msg.sender, to, amount, purpose, block.timestamp);
    }

    function getTransactions() public view returns (Transaction[] memory) {
        return transactions;
    }
}
