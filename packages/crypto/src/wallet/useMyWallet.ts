import { useSwitch } from '@c3/hooks';
import { Fn } from '@c3/types';
import { toHexString } from '@c3/utils';
import { BigNumber, ethers } from 'ethers';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Chain } from '../network/types';
import { toHexChain } from '../network/utils';
import { dbg } from '../utils';
import {
  getWalletProvider,
  hasInjectedProvider,
  injectedProviders,
  WalletName,
} from './injectedProviders';
import { useAccount_ } from './useAccount_';
import { useOnChainChange } from './useOnChainChange';
import { getWalletName, jump2NativeAppOrDlPage } from './utils';

//TODO:TS2742
export type WalletType = {
  readonly provider: ethers.providers.Web3Provider | undefined;
  readonly name: WalletName | undefined;
  readonly addNetwork: (chain: Chain) => Promise<any>;
  readonly switchNetwork: (chain: Chain) => Promise<null>;
  readonly connectAccount: () => Promise<string>;
  readonly account: string | undefined;
  readonly getBalance: () => Promise<BigNumber>;
  readonly getNetwork: () => Promise<ethers.providers.Network>;
  readonly getChainId: () => Promise<number>;
  readonly connected: boolean;
  readonly switchProvider: (walletName: WalletName) => void;
};

export const useMyWallet = (initialName: WalletName | undefined): WalletType => {
  const [name, setName] = useState(initialName);
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | undefined>(
    getWalletProvider(initialName)
  );

  const onChainChanged = useCallback(
    (chainId: number) => {
      dbg('chain changed. new chainId=', chainId);
      if (!name) {
        return;
      }
      const provider = getWalletProvider(name);
      setProvider(provider);
    },
    [name]
  );

  useOnChainChange(name, onChainChanged);

  const account = useAccount_(provider);
  useEffect(() => {
    if (!provider) {
      return;
    }
    setName(getWalletName(provider));
  }, [provider]);

  const addNetwork = useCallback(
    async (chain: Chain) => {
      dbg('[addNetwork] chain=', chain);
      if (!provider) {
        throw new Error('provider is not ready');
      }
      return provider?.send('wallet_addEthereumChain', [toHexChain(chain)]);
    },
    [provider]
  );

  const switchNetwork = useCallback(
    async (chain: Chain) => {
      try {
        dbg('[switchNetwork] chain=', chain);
        if (!provider) {
          throw new Error('provider is null');
        }
        await provider?.send('wallet_switchEthereumChain', [
          { chainId: toHexString(chain.chainId) },
        ]);
      } catch (e: any) {
        console.log('switchNetwork:', e);
        if (e.code === 4902 || e.code === -32603) {
          return addNetwork(chain);
        }
        throw e;
      }
    },
    [addNetwork, provider]
  );
  const switchProvider = useCallback(
    (newName: WalletName) => {
      if (!newName) {
        throw new Error('please supply chainId');
      }
      if (newName === name) {
        return;
      }
      const injectedProvider = injectedProviders[newName].getProvider();
      if (!injectedProvider) {
        jump2NativeAppOrDlPage(newName);
        return;
      }
      const provider = new ethers.providers.Web3Provider(injectedProvider);
      setProvider(provider);
      return provider;
    },
    [name]
  );

  const connectAccount = useCallback(async () => {
    if (!hasInjectedProvider) {
      // jump2NativeAppOrDlPage();
      return;
    }
    if (!provider) {
      throw new Error('provider is not ready');
      return;
    }
    const r = await provider?.send('eth_requestAccounts', []);
    return r[0];
  }, [provider]);

  return {
    provider,
    name,
    account,
    connected: !!account,
    addNetwork,
    switchNetwork,
    switchProvider,
    connectAccount,

    getBalance: async () => {
      if (!account || !provider) {
        return BigNumber.from(0);
      }
      return provider?.getBalance(account);
    },
    getNetwork: async () => {
      if (!provider) {
        throw new Error('wallet provider is undefined');
      }
      return provider?.getNetwork();
    },
    getChainId: async () => {
      if (!provider) {
        throw new Error('wallet provider is undefined');
      }
      const network = await provider?.getNetwork();
      return network.chainId;
    },
  } as const;
};