import EncryptedUploader from "@/app/components/EncryptedUploader";


const TacoEncryptedUploader: React.FC = () => EncryptedUploader({encryptionProvider: "taco"});

export default TacoEncryptedUploader;
