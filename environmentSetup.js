#!/usr/bin/env node

const {
  Client,
  PrivateKey,
  AccountCreateTransaction,
  AccountBalanceQuery,
  Hbar,
  TransferTransaction,
} = require('@hashgraph/sdk');

const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

async function environmentSetup() {
  const myAccountId = process.env.OPERATOR_ACCOUNT_ID;
  // using the DER private key
  const myPrivateKey = process.env.OPERATOR_ACCOUNT_PRIVATE_KEY_DER;

  if (!myAccountId || !myPrivateKey) {
    throw new Error('Environment variables not found');
  } else {
    console.log('Account found successfully');
    console.log('Account ID', myAccountId);
    console.log('Private Key', myPrivateKey);
  }

  // Now we have a valid operator

  const client = Client.forTestnet();
  client.setOperator(myAccountId, myPrivateKey);

  // setting hbar limits
  client.setDefaultMaxTransactionFee(new Hbar(100));
  client.setDefaultMaxQueryPayment(new Hbar(50));

  // create new keys

  const newAccountPrivateKey = PrivateKey.generateED25519();
  const newAccountPublicKey = newAccountPrivateKey.publicKey;

  // creating new account with 1000 tinybars
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
  client.close();
}

environmentSetup();
