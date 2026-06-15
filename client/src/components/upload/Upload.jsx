import { IKContext, IKUpload } from "imagekitio-react";
import { useAuth } from "@clerk/clerk-react";

const urlEndpoint = import.meta.env.VITE_IMAGE_KIT_ENDPOINT;
const publicKey = import.meta.env.VITE_IMAGE_KIT_PUBLIC_KEY;
const apiUrl = import.meta.env.VITE_API_URL || "https://lama-ai-1bq2.onrender.com";

const Upload = ({ setImg }) => {
  const { getToken } = useAuth();

  const authenticator = async () => {
    const token = await getToken();
    const res = await fetch(`${apiUrl}/api/upload`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error("Auth failed");

    return await res.json();
  };
  const onUploadStart = () => {
    setImg((prev) => ({
      ...prev,
      isLoading: true,
      error: "",
    }));
  };

  const onSuccess = (res) => {
    console.log("UPLOAD SUCCESS:", res);

    setImg((prev) => ({
      ...prev,
      isLoading: false,
      dbData: res,
      aiData: {
        inlineData: {
          data: res.filePath,
          mimeType: res.fileType || "image/png",
        },
      },
    }));
  };

  const onError = (err) => {
    console.log("UPLOAD ERROR:", err);

    setImg((prev) => ({
      ...prev,
      isLoading: false,
      error: "Upload failed",
    }));
  };

  return (
    <IKContext
      urlEndpoint={urlEndpoint}
      publicKey={publicKey}
      authenticator={authenticator}
    >
      {/* Upload Button using /attachment.png */}
      <label className="uploadBtn">
        <img src="/attachment.png" alt="attach" />

        {/* hidden upload input */}
        <IKUpload
          fileName="upload-file"
          useUniqueFileName={true}
          onUploadStart={onUploadStart}
          onSuccess={onSuccess}
          onError={onError}
          style={{
            position: "absolute",
            opacity: 0,
            width: "40px",
            height: "40px",
            cursor: "pointer",
          }}
        />
      </label>
    </IKContext>
  );
};

export default Upload;