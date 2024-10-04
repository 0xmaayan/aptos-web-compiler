import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { CopyBlock, dracula } from "react-code-blocks";

// Internal Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { extractMovePackage } from "./utils/helpers";
import { Hex } from "@aptos-labs/ts-sdk";
import { UploadSpinner } from "./components/UploadSpinner";

function App() {
  const { connected, account, wallet, signAndSubmitTransaction } = useWallet();

  // Internal state
  const [files, setFiles] = useState<FileList | null>(null);
  const [data, setData] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [senderAddress, setSenderAddress] = useState<string>();
  // Local Ref
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSenderAddress(account?.address || "");
  }, [account]);
  console.log("senderAddress", senderAddress);
  const onCompileClick = async () => {
    if (!account) throw new Error("Please connect your wallet");
    if (!files) throw new Error("Please upload a Move project folder");

    setIsUploading(true);
    const folderObject = await extractMovePackage(files);
    const project = { ...folderObject, senderAddress: senderAddress };

    try {
      const response = await fetch("https://web-compiler-275734728368.us-central1.run.app/compile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(project),
      });
      const data = await response.json();
      setData(data);
    } catch (error) {
      console.error("Network error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const onPublishClick = async () => {
    const response = await signAndSubmitTransaction({
      data: {
        function: "0x1::code::publish_package_txn",
        functionArguments: [
          Hex.fromHexInput(data.metadataBytes).toUint8Array(),
          [Hex.fromHexInput(data.byteCode[0]).toUint8Array()],
        ],
      },
    });
    console.log("response", response);
  };

  return (
    <>
      <Header />
      <UploadSpinner on={isUploading} />
      <div className="flex items-center justify-center flex-col">
        {connected ? (
          <>
            <Card className="w-1/2 mb-10">
              <CardContent className="flex flex-col gap-10 pt-6">
                <div>
                  <Label>Sender address</Label>
                  <Input type="text" value={account?.address} onChange={(e) => setSenderAddress(e.target.value)} />
                  <p>
                    This address will be used to <code>compile</code> the package, so make sure it is the same address
                    you use to <code>publish</code> the package
                  </p>
                </div>

                {!files?.length && (
                  <div>
                    <Label
                      htmlFor="package"
                      className={buttonVariants({
                        variant: "outline",
                        className: "cursor-pointer",
                      })}
                    >
                      Choose Move Package to Upload
                    </Label>
                    <p>
                      The package should contain a <code>sources</code> folder with the Move source code and a{" "}
                      <code>Move.toml</code> file.
                    </p>
                  </div>
                )}
                <Input
                  className="hidden"
                  ref={inputRef}
                  id="package"
                  disabled={isUploading || !account || !wallet}
                  webkitdirectory="true"
                  multiple
                  type="file"
                  placeholder="Upload package"
                  onChange={(event) => {
                    setFiles(event.currentTarget.files);
                  }}
                />
                {!!files?.length && (
                  <div>
                    {files.length} files selected{" "}
                    <Button
                      variant="link"
                      className="text-destructive"
                      onClick={() => {
                        setFiles(null);
                        inputRef.current!.value = "";
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                )}

                <Button onClick={onCompileClick} disabled={!files || !account}>
                  Compile
                </Button>
              </CardContent>
            </Card>

            {data && (
              <Card className="w-1/2">
                <CardContent className="flex flex-col gap-10 pt-6">
                  <CopyBlock
                    text={JSON.stringify(data, null, 2)}
                    wrapLongLines={true}
                    language="jsx"
                    theme={dracula}
                    showLineNumbers={false}
                    codeBlock
                  />
                  <Button onClick={onPublishClick}>Publish Package</Button>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <CardHeader>
            <CardTitle>To get started Connect a wallet</CardTitle>
          </CardHeader>
        )}
      </div>
    </>
  );
}

export default App;
