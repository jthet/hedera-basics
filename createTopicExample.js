const {
  Client,
  PrivateKey,
  Hbar,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TopicMessageQuery,
} = require('@hashgraph/sdk');

const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

async function createTopicExample() {
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

  // transaction time
  const transaction = new TopicCreateTransaction();

  const txResponse = await transaction.execute(client);

  const receipt = await txResponse.getReceipt(client);

  const newTopicId = receipt.topicId;

  console.log('the new topic ID is ' + newTopicId);

  await new TopicMessageSubmitTransaction({
    topicId: newTopicId,
    message: 'Hello World!',
  }).execute(client);

  // // getting topic messages
  // new TopicMessageQuery()
  // .setTopicId(newTopicId)
  // .setStartTime(0)
  // .subscribe(
  //     client,
  //     (message) => console.log(Buffer.from(message.contents, 'utf8').toString())
  // );

  client.close();
}

createTopicExample();
