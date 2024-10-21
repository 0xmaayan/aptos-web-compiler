import { InputTransactionData, useWallet } from "@aptos-labs/wallet-adapter-react";
import { CopyBlock, dracula } from "react-code-blocks";

// Internal Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { useRef, useState } from "react";
import { extractMovePackage } from "./utils/helpers";
import { UploadSpinner } from "./components/UploadSpinner";
import { Aptos, AptosConfig } from "@aptos-labs/ts-sdk";
import { useToast } from "./components/ui/use-toast";
import { TransactionHash } from "./components/TransactionHash";

interface NamedAddresse {
  name: string;
  address: string;
}

function App() {
  const { connected, account, wallet, signAndSubmitTransaction, network } = useWallet();
  const { toast } = useToast();

  // Internal state
  const [files, setFiles] = useState<FileList | null>(null);
  const [data, setData] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  // State to store the name-address pairs
  const [namedAddresses, setNamedAddresses] = useState<NamedAddresse[]>([{ name: "", address: "" }]);
  // Local Ref
  const inputRef = useRef<HTMLInputElement>(null);

  // Function to handle input changes
  const handleInputChange = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const values = [...namedAddresses];
    values[index][event.target.name as keyof NamedAddresse] = event.target.value;
    setNamedAddresses(values);
  };

  // Function to add a new input field
  const handleAddFields = () => {
    setNamedAddresses([...namedAddresses, { name: "", address: "" }]);
  };

  // Function to remove an input field
  const handleRemoveFields = (index: number) => {
    const values = [...namedAddresses];
    values.splice(index, 1);
    setNamedAddresses(values);
  };

  const onCompileClick = async () => {
    if (!account) throw new Error("Please connect your wallet");
    if (!files) throw new Error("Please upload a Move project folder");

    const folderObject = await extractMovePackage(files);

    // Convert fields to object
    const namedAddressesObject = namedAddresses.reduce(
      (obj, field) => {
        if (field.name && field.address) {
          obj[field.name] = field.address;
        }
        return obj;
      },
      {} as { [key: string]: string },
    );

    const project = {
      ...folderObject,
      namedAddresses: namedAddressesObject,
    };

    try {
      setIsUploading(true);
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
    const aptosConfig = new AptosConfig({ network: network?.name });
    const aptos = new Aptos(aptosConfig);
    try {
      const transaction: InputTransactionData = {
        data: {
          function: "0x1::code::publish_package_txn",
          functionArguments: [data.metadataBytes, data.byteCode],
        },
      };
      const response = await signAndSubmitTransaction(transaction);
      await aptos.waitForTransaction({
        transactionHash: response.hash,
      });
      toast({
        title: "Success",
        description: <TransactionHash hash={response.hash} network={network} />,
      });
    } catch (error: any) {
      console.log("error", error);
      toast({
        variant: "destructive",
        title: "Transaction submission failed",
        description: `Your transaction failed to submit. ${error}`,
      });
    }
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

                <div className="flex flex-col gap-2">
                  <h1>Named Addresses</h1>
                  {namedAddresses.map((field, index) => (
                    <div key={index} className="flex flex-row gap-2">
                      <Input
                        type="text"
                        name="name"
                        placeholder="Enter name"
                        value={field.name}
                        onChange={(event) => handleInputChange(index, event)}
                      />
                      <Input
                        type="text"
                        name="address"
                        placeholder="Enter address"
                        value={field.address}
                        onChange={(event) => handleInputChange(index, event)}
                      />
                      <Button type="button" onClick={() => handleRemoveFields(index)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button type="button" onClick={handleAddFields} className="w-fit">
                    Add More
                  </Button>
                </div>

                <Button onClick={onCompileClick} disabled={!files || !account}>
                  Compile
                </Button>
              </CardContent>
            </Card>

            {data && (
              <>
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
                  </CardContent>
                </Card>
                <Button onClick={onPublishClick} className="w-1/2">
                  Publish
                </Button>
              </>
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
