import {conditions, decrypt, domains, encrypt, getPorterUri} from "@nucypher/taco";
import {providers} from "ethers";
import {arrayBufferToBlob, blobToDataURL, downloadFile, uploadFile} from "@/app/utils/irys";


interface WindowWithEthereum extends Window {
    ethereum?: any;
}

// TACo config
export const TACO_RITUAL_ID = parseInt(process.env.TACO_RITUAL_ID || '0');
export const TACO_DOMAIN = process.env.TACO_DOMAIN || domains.TESTNET;

async function encryptFile(file: File) {
    const asBuffer = await file.arrayBuffer();
    const asBytes = new Uint8Array(asBuffer);

    const hasPositiveBalance = new conditions.base.rpc.RpcCondition({
        chain: 80001, // Mumbai chain id
        method: 'eth_getBalance',
        parameters: [':userAddress'],
        returnValueTest: {
            comparator: '>',
            value: 0,
        },
    });

    const provider = new providers.Web3Provider((window as WindowWithEthereum).ethereum);
    const encryptedMessage = await encrypt(
        provider,
        TACO_DOMAIN,
        asBytes,
        hasPositiveBalance,
        TACO_RITUAL_ID,
        provider.getSigner(),
    );

    const encryptedFile = new File([encryptedMessage.toBytes()], file.name, {type: file.type});

    return encryptedFile;
}

// Encrypts and then uploads a File
async function encryptAndUploadFile(file: File): Promise<string> {
    const encryptedFile = await encryptFile(file);
    return await uploadFile(encryptedFile);
}

async function decryptFile(id: string, encryptedFileType: string): Promise<string> {
    try {
        // 1. Retrieve the zipBlob from https://gateway.irys.xyz/${id}
        const zipBlob = await downloadFile(id);

        // 2. Convert to a Uint8Array
        const asArrayBuffer = await zipBlob.arrayBuffer();
        const asBytes = new Uint8Array(asArrayBuffer);

        // 3. Decrypt the file
        const provider = new providers.Web3Provider((window as WindowWithEthereum).ethereum);
        const asBytesDecrypted  = await decrypt(
            provider,
            TACO_DOMAIN,
            asBytes,
            getPorterUri(TACO_DOMAIN),
            provider.getSigner(),
        );
        // 4. Convert to a blob
        const blob = arrayBufferToBlob(asBytesDecrypted, encryptedFileType);

        // 5. Build a dynamic URL
        const dataUrl = await blobToDataURL(blob);

        return dataUrl;
    } catch (e) {
        console.error("Error decrypting file:", e);
    }
    return "";
}

export { encryptAndUploadFile, decryptFile };
