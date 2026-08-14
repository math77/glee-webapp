import { ConnectButton } from '@rainbow-me/rainbowkit';
import WalletIcon from '../WalletIcon/WalletIcon';


const WalletButton = ({iconVersion, shape, backgroundColor, paddingX, paddingY}: {
  iconVersion: boolean,
  shape: string,
  backgroundColor: string,
  paddingX: string,
  paddingY?: string
}) => {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        // Note: If your app doesn't use authentication, you
        // can remove all 'authenticationStatus' checks
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus ||
            authenticationStatus === 'authenticated');
        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              'style': {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button 
                    className={`${backgroundColor} font-semibold text-white ${paddingX} py-4 ${shape} cursor-pointer disabled:bg-slate-700 font-[family-name:var(--font-pixelify-sans)]`}
                    onClick={openConnectModal} 
                    type="button"
                    disabled={false}
                  >
                    {iconVersion ? <WalletIcon /> : "Connect wallet"}
                  </button>
                );
              }
              if (chain.unsupported) {
                return (
                  <button 
                    className={`bg-red-600 font-semibold text-white ${paddingX} py-2 rounded-full font-[family-name:var(--font-pixelify-sans)]`}
                    onClick={openChainModal} 
                    type="button"
                  >
                    Wrong network
                  </button>
                );
              }
              return (
                <div style={{ display: 'flex', gap: 12, color: '#fff' }}>
                  <button
                    onClick={openChainModal}
                    style={{ display: 'flex', alignItems: 'center' }}
                    type="button"
                  >
                    {chain.hasIcon && (
                      <div
                        style={{
                          background: chain.iconBackground,
                          width: 12,
                          height: 12,
                          borderRadius: 999,
                          overflow: 'hidden',
                          marginRight: 4,
                        }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            style={{ width: 12, height: 12 }}
                          />
                        )}
                      </div>
                    )}
                  </button>
                  <button 
                    className="text-white font-semibold font-[family-name:var(--font-pixelify-sans)]"
                    onClick={openAccountModal} 
                    type="button"
                  >
                    {account.displayName}
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};

export default WalletButton;