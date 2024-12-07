#!/usr/bin/env node

const {
  Client,
  PrivateKey,
  AccountId,
  Hbar,
  AccountBalanceQuery,
  AccountCreateTransaction,
} = require('@hashgraph/sdk');

const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

async function connectLocalNode() {
  // creating local client on local network

  // this connects the local consensus node running on port 50211
  const node = { '127.0.0.1:50211': new AccountId(3) };

  // this sets the mirror node to local port 5600
  const client = Client.forNetwork(node).setMirrorNetwork('127.0.0.1:5600');

  // default operator
  client.setOperator(
    AccountId.fromString('0.0.2'),
    PrivateKey.fromString(
      '302e020100300506032b65700422042091132178e72057a1d7528025956fe39b0b847f200ab59b2fdd367017f3087137',
    ),
  );

  console.log('Client node connected');

  // setting hbar limits
  client.setDefaultMaxTransactionFee(new Hbar(100));
  client.setDefaultMaxQueryPayment(new Hbar(50));

  // Create a new account on local

  // Creating a new account to transact with
  const newAccountPrivateKey = PrivateKey.generateED25519();
  const newAccountPublicKey = newAccountPrivateKey.publicKey;

  const newAccount = await new AccountCreateTransaction()
    .setKey(newAccountPublicKey)
    .setInitialBalance(Hbar.fromTinybars(1000))
    .execute(client);

  // get new account ID
  const getReceipt = await newAccount.getReceipt(client);
  const newAccoundId = getReceipt.accountId;

  // log account ID
  console.log('The new account ID is: ' + newAccoundId);

  const accountBalance = await new AccountBalanceQuery()
    .setAccountId(newAccoundId)
    .execute(client);

  console.log(
    'The account balance is: ' +
      accountBalance.hbars.toTinybars() +
      ' tinybars',
  );

  // future work ... add example transaction

  client.close();
}

connectLocalNode();
