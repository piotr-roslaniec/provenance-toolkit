import * as LitJsSdk from "@lit-protocol/lit-node-client";
import {arrayBufferToBlob, blobToDataURL, downloadFile, uploadFile} from "@/app/utils/irys";

async function encryptFile(file: File) {
	// 1. Connect to a Lit node
	const litNodeClient = new LitJsSdk.LitNodeClient({
		litNetwork: "cayenne",
	});
	await litNodeClient.connect();

	// 2. Ensure we have a wallet signature
	const authSig = await LitJsSdk.checkAndSignAuthMessage({
		chain: process.env.NEXT_PUBLIC_LIT_CHAIN || "polygon",
	});

	// 3. Define access control conditions.
	// This defines who can decrypt, current settings allow for
	// anyone with a ETH balance >= 0 to decrypt, which
	// means that anyone can. This is for demo purposes.
	const accessControlConditions = [
		{
			contractAddress: "",
			standardContractType: "",
			chain: "ethereum",
			method: "eth_getBalance",
			parameters: [":userAddress", "latest"],
			returnValueTest: {
				comparator: ">=",
				value: "0",
			},
		},
	];

	// 4. Create a zip blob containing the encrypted file and associated metadata
	const zipBlob = await LitJsSdk.encryptFileAndZipWithMetadata({
		chain: process.env.NEXT_PUBLIC_LIT_CHAIN || "polygon",
		authSig,
		accessControlConditions,
		file,
		litNodeClient,
		readme: "This file was encrypted using LitProtocol and the Irys Provenance Toolkit.",
	});

	return zipBlob;
}

// Encrypts and then uploads a File
async function encryptAndUploadFile(file: File): Promise<string> {
	const encryptedData = await encryptFile(file);
	return await uploadFile(encryptedData);
}

async function decryptFile(id: string, encryptedFileType: string): Promise<string> {
	try {
		// 1. Retrieve the zipBlob from https://gateway.irys.xyz/${id}
		const zipBlob = await downloadFile(id);

		// 2. Connect to a Lit node
		const litNodeClient = new LitJsSdk.LitNodeClient({
			litNetwork: "cayenne",
		});
		await litNodeClient.connect();

		// 2.5 You might need to get authSig or sessionSigs here if required
		const authSig = await LitJsSdk.checkAndSignAuthMessage({
			chain: process.env.NEXT_PUBLIC_LIT_CHAIN || "polygon",
		});

		// 3. Decrypt the zipBlob
		const result = await LitJsSdk.decryptZipFileWithMetadata({
			file: zipBlob,
			litNodeClient: litNodeClient,
			authSig: authSig, // Include this only if necessary
		});
		// @ts-ignore
		const decryptedFile = result.decryptedFile;
		// 4. Convert to a blob
		const blob = arrayBufferToBlob(decryptedFile, encryptedFileType);
		// 5. Build a dynamic URL
		const dataUrl = await blobToDataURL(blob);

		return dataUrl;
	} catch (e) {
		console.error("Error decrypting file:", e);
	}
	return "";
}

export { encryptAndUploadFile, decryptFile };
