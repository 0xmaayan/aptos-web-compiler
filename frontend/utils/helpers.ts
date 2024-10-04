import { Network } from "@aptos-labs/ts-sdk";
import { NetworkInfo, isAptosNetwork } from "@aptos-labs/wallet-adapter-react";

export const isValidNetworkName = (network: NetworkInfo | null) => {
  if (isAptosNetwork(network)) {
    return Object.values<string | undefined>(Network).includes(network?.name);
  }
  // If the configured network is not an Aptos network, i.e is a custom network
  // we resolve it as a valid network name
  return true;
};

export const extractMovePackage = (
  files: FileList,
): Promise<{
  files: { name: string; content: string }[];
  toml: { content: string };
}> => {
  return new Promise((resolve, reject) => {
    const folderObject: {
      files: { name: string; content: string }[];
      toml: { content: string };
    } = {
      files: [],
      toml: { content: "" },
    };

    const fileReadPromises: Promise<void>[] = [];

    // Loop through the files
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      const fileReadPromise = new Promise<void>((fileResolve, fileReject) => {
        const reader = new FileReader();

        reader.onload = function (event) {
          const fileContent = event.target?.result as string;

          // Check if it's the Move.toml file
          if (file.name === "Move.toml") {
            folderObject.toml.content = fileContent;
          } else {
            // Add other files to the files array
            folderObject.files.push({
              name: file.name,
              content: fileContent,
            });
          }
          fileResolve();
        };

        reader.onerror = () => fileReject(new Error(`Error reading file: ${file.name}`));

        // Read the file as text
        reader.readAsText(file);
      });

      fileReadPromises.push(fileReadPromise);
    }

    // Resolve the folderObject once all files are read
    Promise.all(fileReadPromises)
      .then(() => resolve(folderObject))
      .catch((error) => reject(error));
  });
};
