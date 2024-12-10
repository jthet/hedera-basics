#!/usr/bin/env node

const {
  Client,
  PrivateKey,
  AccountCreateTransaction,
  AccountBalanceQuery,
  Hbar,
  TransferTransaction,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenAssociationTransaction,
  TokenAssociateTransaction,
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

  // New code for this file
  // CREATE FUNGIBLE TOKEN (STABLECOIN)

  const supplyKey = PrivateKey.generate();

  let tokenCreateTx = await new TokenCreateTransaction()
    .setTokenName('THETCOIN')
    .setTokenSymbol('THETTY')
    .setTokenType(TokenType.FungibleCommon)
    .setDecimals(2)
    .setInitialSupply(10000)
    .setTreasuryAccountId(myAccountId)
    .setSupplyType(TokenSupplyType.Infinite)
    .setSupplyKey(supplyKey)
    .freezeWith(client);

  //SIGN WITH TREASURY KEY
  let tokenCreateSign = await tokenCreateTx.sign(
    PrivateKey.fromStringDer(myPrivateKey), // need to conver to string. apparently "PrivateKey.fromString()" is deprecated
  );

  PrivateKey.fromStringDer;
  //SUBMIT THE TRANSACTION
  let tokenCreateSubmit = await tokenCreateSign.execute(client);

  //GET THE TRANSACTION RECEIPT
  let tokenCreateRx = await tokenCreateSubmit.getReceipt(client);

  //GET THE TOKEN ID
  let tokenId = tokenCreateRx.tokenId;

  //LOG THE TOKEN ID TO THE CONSOLE
  console.log(`- Created token with ID: ${tokenId} \n`);

  // associate token with new account
  const transaction = await new TokenAssociateTransaction()
    .setAccountId(newAccoundId)
    .setTokenIds([tokenId])
    .freezeWith(client);

  const signTx = await transaction.sign(newAccountPrivateKey);
  const txResponse = await signTx.execute(client);
  const associationRecepit = await txResponse.getReceipt(client);
  const transactionStatus = associationRecepit.status;
  console.log('Association transaction Status: ' + transactionStatus);

  // before transfer, lets do a balance query:
  var balanceCheckTx = await new AccountBalanceQuery()
    .setAccountId(myAccountId)
    .execute(client);
  console.log(
    `My Account Balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`,
  );
  var balanceCheckTx = await new AccountBalanceQuery()
    .setAccountId(newAccoundId)
    .execute(client);
  console.log(
    `My Account Balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`,
  );

  // send token from my account to new accound
  const transferTransaction = await new TransferTransaction()
    .addTokenTransfer(tokenId, myAccountId, -100) // from
    .addTokenTransfer(tokenId, newAccoundId, 100) // to
    .freezeWith(client);

  const transferSign = await transferTransaction.sign(
    PrivateKey.fromStringDer(myPrivateKey),
  ); // signing with my account bc I am sending the toke
  const transferTxResponse = await transferSign.execute(client);
  const transferReceipt = await transferTxResponse.getReceipt(client);
  const transferStatus = transferReceipt.status;
  console.log('Transfer Status: ' + transferStatus);

  // after transfer, lets do a balance query:
  var balanceCheckTx = await new AccountBalanceQuery()
    .setAccountId(myAccountId)
    .execute(client);
  console.log(
    `My Account Balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`,
  );

  var balanceCheckTx = await new AccountBalanceQuery()
    .setAccountId(newAccoundId)
    .execute(client);
  console.log(
    `My Account Balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`,
  );

  client.close();
}

environmentSetup();
