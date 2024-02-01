import * as dotenv from 'dotenv';
dotenv.config({
  path: __dirname + '/.env',
});
import {NFT2Client} from '../src/nft2client';

async function main() {
  const nft2Client = await testClient();
  // console.log('nft2Client: ', nft2Client);
  await nft2Client.initialize().then(() => {
    console.log('Client init success');
  });

  const bnbContract = nft2Client.getNFT2Contract(97);
  console.log('bnbContract: ', bnbContract);
  const nfts = await bnbContract.getNFTInfo(
    '0x8677f7be2456dd1161809bbff6b32ef65709fc88',
    '0',
    '0x63d1db1730eb531b86623a9f9b26f3e85e30a312',
    '12'
  );
  console.log('nft: ', nfts);
}

const testClient = async () => {
  const apiKey = process.env.API_KEY || '';
  const nft2Client = new NFT2Client(apiKey);
  return nft2Client;
};

main().catch(console.error);
