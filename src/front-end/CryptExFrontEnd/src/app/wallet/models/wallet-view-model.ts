import { WalletPairViewModel } from "./wallet-pair-view-model";

export enum WalletType {
    Fiat = 1,
    Crypto = 2
}

export interface WalletViewModel {
    id: string;
    ticker: string;
    fullName: string;
    type: WalletType;
    selectedCurrencyPair: WalletPairViewModel;
    adminWalletAddress?: string;
    isAddressConfigured?: boolean;
}