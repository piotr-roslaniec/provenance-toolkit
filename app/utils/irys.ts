import getIrys from "../utils/getIrys";

type Tag = {
    name: string;
    value: string;
};

// Get the URL of the Arweave gateway this instance is configured to use
// Ensure it has a trailing slash
const GATEWAY_BASE = (process.env.NEXT_PUBLIC_GATEWAY || "https://gateway.irys.xyz/").endsWith("/")
    ? process.env.NEXT_PUBLIC_GATEWAY || "https://gateway.irys.xyz/"
    : (process.env.NEXT_PUBLIC_GATEWAY || "https://gateway.irys.xyz/") + "/";

// Uploads the encrypted File (with metadata) to Irys
export async function uploadFile(file: File): Promise<string> {
    const irys = await getIrys();

    try {
        const price = await irys.getPrice(file?.size);
        const balance = await irys.getLoadedBalance();

        if (price.isGreaterThanOrEqualTo(balance)) {
            console.log("Funding node.");
            await irys.fund(price);
        } else {
            console.log("Funding not needed, balance sufficient.");
        }

        // Tag the upload marking it as
        // - Binary file
        // - Containing a file of type file.type (used when displaying)
        // - Encrypted (used by our display code)
        const tags: Tag[] = [
            {
                name: "Content-Type",
                value: "application/octet-stream",
            },
            {
                name: "Encrypted-File-Content-Type",
                value: file.type,
            },
            {
                name: "Irys-Encrypted",
                value: "true",
            },
        ];

        const receipt = await irys.uploadFile(file, {
            tags,
        });
        console.log(`Uploaded successfully. ${GATEWAY_BASE}${receipt.id}`);

        return receipt.id;
    } catch (e) {
        console.log("Error uploading single file ", e);
    }
    return "";
}


// Helper functions for use in showing decrypted images
export function arrayBufferToBlob(buffer: ArrayBuffer, type: string): Blob {
    return new Blob([buffer], { type: type });
}

export function blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                resolve(event.target.result as string);
            } else {
                reject(new Error("Failed to read blob as Data URL"));
            }
        };
        reader.readAsDataURL(blob);
    });
}

export async function downloadFile(receiptId: string): Promise<Blob> {
    const response = await fetch(`${GATEWAY_BASE}${receiptId}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch encrypted file from gateway with ID: ${receiptId}`);
    }
    return await response.blob();
}
