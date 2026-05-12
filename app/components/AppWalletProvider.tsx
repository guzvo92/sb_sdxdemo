"use client";

import React, { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
    SolanaMobileWalletAdapter,
    createDefaultAddressSelector,
    createDefaultAuthorizationResultCache,
    createDefaultWalletNotFoundHandler,
} from "@solana-mobile/wallet-adapter-mobile";
import { PhantomWalletAdapter }  from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import "@solana/wallet-adapter-react-ui/styles.css";

// Fallback al RPC publico de mainnet si la env no esta seteada.
const DEFAULT_RPC = "https://api.mainnet-beta.solana.com";

export default function AppWalletProvider({ children }: { children: React.ReactNode }) {
    const endpoint = useMemo(
        () => process.env.NEXT_PUBLIC_SOLANA_RPC ?? DEFAULT_RPC,
        [],
    );

    // PhantomWalletAdapter / SolflareWalletAdapter explicitos: garantizan que
    // autoConnect tenga adapter disponible en el primer render. Sin esto,
    // wallet-standard descubre Phantom tarde y autoConnect no lo encuentra
    // a tiempo -> el boton se queda en "CONNECT" tras recargar.
    //
    // SolanaMobileWalletAdapter implementa el protocolo MWA — necesario para
    // que el click en "Mobile Wallet Adapter" en el modal dispare el deeplink
    // a la app wallet (Phantom mobile, Solflare mobile, Jupiter, etc).
    const wallets = useMemo(() => [
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter(),
        new SolanaMobileWalletAdapter({
            addressSelector:           createDefaultAddressSelector(),
            appIdentity:               {
                name: "SatellDex",
                uri:  "https://satelldex.com",
                icon: "/favicon.ico",
            },
            authorizationResultCache:  createDefaultAuthorizationResultCache(),
            chain:                     "solana:mainnet",
            onWalletNotFound:          createDefaultWalletNotFoundHandler(),
        }),
    ], []);

    // autoConnect=true: reconecta silencioso al recargar si ya hubo connect
    // previo (wallet-adapter guarda walletName en localStorage). No dispara
    // modal ni deeplink en visitas first-time porque sin walletName no hay
    // a quien reconectar. En mobile, MWA usa el authorizationResultCache
    // configurado arriba y reusa la sesion sin relanzar el flow de auth.
    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect={true}>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}
