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
  TokenMintTransaction,
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
  const newAccountId = getReceipt.accountId;

  // log account ID
  console.log('The new account ID is: ' + newAccountId);

  ////////////////////////////////////////////////////
  // create token (NFT)
  const supplyKey = PrivateKey.generateED25519();

  const nftCreate = await new TokenCreateTransaction()
    .setTokenName('thettoken')
    .setTokenSymbol('THET')
    .setTokenType(TokenType.NonFungibleUnique)
    .setDecimals(0)
    .setInitialSupply(0)
    .setTreasuryAccountId(myAccountId)
    .setSupplyType(TokenSupplyType.Finite)
    .setMaxSupply(250)
    .setSupplyKey(supplyKey)
    .freezeWith(client);

  // log supply key
  console.log('Supply Key: ' + supplyKey);

  //Sign the transaction with the treasury key
  const nftCreateTxSign = await nftCreate.sign(
    PrivateKey.fromStringDer(myPrivateKey),
  );

  //Submit the transaction to a Hedera network
  const nftCreateSubmit = await nftCreateTxSign.execute(client);

  //Get the transaction receipt
  const nftCreateRx = await nftCreateSubmit.getReceipt(client);

  //Get the token ID
  const tokenId = nftCreateRx.tokenId;

  //Log the token ID
  console.log('Created NFT with Token ID: ' + tokenId);

  ////////////////<Minting New NFTs>/////////////////////
  // Max transaction fee as a constant
  const maxTransactionFee = new Hbar(20);

  //IPFS content identifiers for which we will create a NFT
  const CID = [
    Buffer.from(
      'ipfs://bafyreiao6ajgsfji6qsgbqwdtjdu5gmul7tv2v3pd6kjgcw5o65b2ogst4/metadata.json',
    ),
    Buffer.from(
      'ipfs://bafyreic463uarchq4mlufp7pvfkfut7zeqsqmn3b2x3jjxwcjqx6b5pk7q/metadata.json',
    ),
    Buffer.from(
      'ipfs://bafyreihhja55q6h2rijscl3gra7a3ntiroyglz45z5wlyxdzs6kjh2dinu/metadata.json',
    ),
    Buffer.from(
      'ipfs://bafyreidb23oehkttjbff3gdi4vz7mjijcxjyxadwg32pngod4huozcwphu/metadata.json',
    ),
    Buffer.from(
      'ipfs://bafyreie7ftl6erd5etz5gscfwfiwjmht3b52cevdrf7hjwxx5ddns7zneu/metadata.json',
    ),
  ];

  // MINT NEW BATCH OF NFTs
  const mintTx = new TokenMintTransaction()
    .setTokenId(tokenId)
    .setMetadata(CID) //Batch minting - UP TO 10 NFTs in single tx
    .setMaxTransactionFee(maxTransactionFee)
    .freezeWith(client);

  //Sign the transaction with the supply key
  const mintTxSign = await mintTx.sign(supplyKey);

  //Submit the transaction to a Hedera network
  const mintTxSubmit = await mintTxSign.execute(client);

  //Get the transaction receipt
  const mintRx = await mintTxSubmit.getReceipt(client);

  //Log the serial number
  console.log(
    'Created NFT ' + tokenId + ' with serial number: ' + mintRx.serials,
  );

  ////////////////<Associate User Accounts with the NFT>/////////////////////
  //Create the associate transaction and sign with the new account key
  const associateAccountTx = await new TokenAssociateTransaction()
    .setAccountId(newAccountId)
    .setTokenIds([tokenId])
    .freezeWith(client)
    .sign(newAccountPrivateKey);

  //Submit the transaction to a Hedera network
  const associateAccountTxSubmit = await associateAccountTx.execute(client);

  //Get the transaction receipt
  const associateAccountRx = await associateAccountTxSubmit.getReceipt(client);

  //Confirm the transaction was successful
  console.log(
    `NFT association with New account: ${associateAccountRx.status}\n`,
  );

  // // balance query
  var balanceCheckTx = await new AccountBalanceQuery()
    .setAccountId(myAccountId)
    .execute(client);
  console.log(
    `My Account Balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`,
  );
  var balanceCheckTx = await new AccountBalanceQuery()
    .setAccountId(newAccountId)
    .execute(client);
  console.log(
    `New Account Balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`,
  );

  const tokenTransferTx = await new TransferTransaction()
    .addNftTransfer(tokenId, 1, myAccountId, newAccountId)
    .freezeWith(client)
    .sign(PrivateKey.fromStringDer(myPrivateKey));

  const tokenTransferSubmit = await tokenTransferTx.execute(client);
  const tokenTransferRx = await tokenTransferSubmit.getReceipt(client);

  console.log(
    'NFT Transfer from Treasury to new account: ' + tokenTransferRx.status,
  );

  var balanceCheckTx = await new AccountBalanceQuery()
    .setAccountId(myAccountId)
    .execute(client);
  console.log(
    `My Account Balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`,
  );
  var balanceCheckTx = await new AccountBalanceQuery()
    .setAccountId(newAccountId)
    .execute(client);
  console.log(
    `New Account Balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`,
  );

  client.close();
}

environmentSetup();
