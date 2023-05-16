import {BigNumber, ethers} from 'ethers';

const pack = require('../../package.json');

import {getInfos, getSigner} from './blockchain';

import {
  separateJsonSchema,
  encodeDataFromJsonSchema,
  encodeDataKey,
  buildURLQuery,
  validateData,
} from './utils';

import {OAuth2Client} from '../auth/oauth2client';
import {
  NFTMetadataUpdateRequest,
  ProtocolClientOptions,
  NFTMetadataUpdateResponse,
  NFTDetailResponse,
  NFTDetailRequest,
  ProviderSchemaResponse,
  NFTProviderRequest,
  NFTProviderResponse,
  NFTMetadataRequest,
  NFTTransactionHistoryRequest,
  NFTTransactionHistoryResponse,
  NFTRequest,
  NFTResponse,
  NFTTokenURIResponse,
} from './interfaces';

export class ProtocolClient {
  auth: OAuth2Client;
  rpcUrl: string;
  signer: ethers.Wallet;
  version: string;

  constructor(setting: ProtocolClientOptions) {
    this.auth = new OAuth2Client(setting.opts);

    this.rpcUrl = setting.rpcUrl;
    this.signer = getSigner(this.rpcUrl, {
      privateKey: setting?.privateKey,
      mnemonic: setting?.mnemonic,
    });

    this.version = `v${pack.version.split('.')[0]}`;
  }

  getHostPath(): string {
    return `${this.auth.url}/${this.version}`;
  }

  /**
   * Update NFT metadata.
   * @param data nft metadata info.
   */
  async updateMetadata(
    data: NFTMetadataUpdateRequest
  ): Promise<NFTMetadataUpdateResponse> {
    const {nftContractAddress, tokenData, tokenId, schema} = data;

    const originalTokenData = JSON.parse(JSON.stringify(tokenData));

    const {signer, nftContract, chainId} = await getInfos(
      this.signer,
      nftContractAddress
    );

    const providerAddress = signer.address;

    const valid = validateData(schema, tokenData);

    if (!valid) {
      throw new Error('Json schema not match data');
    }

    const schemas = separateJsonSchema(schema) as any;

    const dataKeys = schemas.map((e: any) => {
      return encodeDataKey(providerAddress, e.key);
    }) as string[];
    const dataValues = schemas.map((e: any) =>
      encodeDataFromJsonSchema(e, {
        [e.key]: tokenData[e.key],
      })
    ) as string[];

    const nonce = (await nftContract.getNonce(
      signer.address,
      tokenId
    )) as BigNumber;

    const verifiedSig = await signer._signTypedData(
      {
        name: 'ERC725Z2',
        version: '0.0.1',
        chainId,
        verifyingContract: nftContract.address,
      },
      {
        SetData: [
          {name: 'nonce', type: 'uint256'},
          {name: 'tokenId', type: 'uint256'},
          {name: 'dataKeys', type: 'bytes32[]'},
          {name: 'dataValues', type: 'bytes[]'},
        ],
      },
      {
        nonce,
        tokenId,
        dataKeys,
        dataValues,
      }
    );

    const body = {
      tokenId: tokenId,
      nftContractAddress: nftContractAddress,
      providerAddress,
      chainId: chainId,
      providerSignature: verifiedSig,
      nftData: originalTokenData,
      dataKeys,
      dataValues,
    };

    const result = await this.auth.request<NFTMetadataUpdateResponse>({
      url: `${this.getHostPath()}/client/nfts/update-metadata`,
      method: 'POST',
      data: JSON.stringify(body),
    });

    return result.data;
  }

  async getProviderSchema(
    providerAddress: string
  ): Promise<ProviderSchemaResponse> {
    const result = await this.auth.request<ProviderSchemaResponse>({
      url: `${this.getHostPath()}/client/nft-schemas/${providerAddress}`,
      method: 'GET',
    });

    return result?.data;
  }

  /**
   * @param nftContractAddress nft contract address
   * @param tokenId token id of nft
   * @returns nft detail info
   */
  async getNFTDetail(query: NFTDetailRequest): Promise<NFTDetailResponse> {
    const params = buildURLQuery({
      contract_address: query.contractAddress,
      chain_id: query.chainId,
    });

    const result = await this.auth.request<NFTDetailResponse>({
      url: `${this.getHostPath()}/client/nfts/${query.tokenId}${params}`,
      method: 'GET',
    });

    return result?.data;
  }

  async getNFTProviders(
    query: NFTProviderRequest
  ): Promise<NFTProviderResponse> {
    const params = buildURLQuery({
      contract_address: query.contractAddress,
      chain_id: query.chainId,
      limit: query.limit,
      offset: query.offset,
    });

    const result = await this.auth.request<NFTProviderResponse>({
      url: `${this.getHostPath()}/client/nfts/${
        query.tokenId
      }/providers${params}`,
      method: 'GET',
    });

    return result?.data;
  }

  async getNFTMetadatas(query: NFTMetadataRequest): Promise<any> {
    const params = buildURLQuery({
      contract_address: query.contractAddress,
      chain_id: query.chainId,
      provider_address: query.providerAddress,
    });

    const result = await this.auth.request({
      url: `${this.getHostPath()}/client/nfts/${
        query.tokenId
      }/metadatas${params}`,
      method: 'GET',
    });

    return result?.data;
  }

  async getNFTTransactionHistory(
    query: NFTTransactionHistoryRequest
  ): Promise<NFTTransactionHistoryResponse> {
    const params = buildURLQuery({
      filter: query.filter,
      limit: query.limit,
      offset: query.offset,
    });

    const result = await this.auth.request<NFTTransactionHistoryResponse>({
      url: `${this.getHostPath()}/client/transactions${params}`,
      method: 'GET',
    });

    return result?.data;
  }

  async getNFTDetails(query: NFTDetailRequest[]): Promise<NFTResponse> {
    const result = await this.auth.request<NFTResponse>({
      url: `${this.getHostPath()}/client/nfts/get-nft-details`,
      method: 'POST',
      data: {
        queryParams: query,
      },
    });

    return result?.data;
  }

  async getNFTs(query: NFTRequest): Promise<NFTResponse> {
    const params = buildURLQuery({
      filter: query.filter,
      limit: query.limit,
      offset: query.offset,
    });

    const result = await this.auth.request<NFTResponse>({
      url: `${this.getHostPath()}/client/nfts${params}`,
      method: 'GET',
    });

    return result?.data;
  }

  async getNFTTokenURIs(
    query: NFTDetailRequest[]
  ): Promise<NFTTokenURIResponse> {
    const result = await this.auth.request<NFTTokenURIResponse>({
      url: `${this.getHostPath()}/client/nft-token-uris/get-nft-token-uris`,
      method: 'POST',
      data: {
        queryParams: query,
      },
    });

    return result?.data;
  }
}
