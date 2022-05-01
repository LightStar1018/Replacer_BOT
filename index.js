const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const config = require('./config.json');

const web3 = createAlchemyWeb3(config.rpc.wss);

let bRunning = false;

const main = async () => {
    var sub_id = web3.eth.subscribe("alchemy_fullPendingTransactions", async (error, result) => {
        if (!error && !bRunning) {
            if (result.from.toLowerCase() == config.account.public.toLowerCase()) {
                console.log("result:", result);

                let tx;
                if (result.type == 2) {
                    tx = {
                        "gas": result.gas,
                        "maxFeePerGas": Math.round(result.maxFeePerGas * 1.5),
                        "maxPriorityFeePerGas": Math.round(result.maxPriorityFeePerGas * 1.5),
                        "input": result.input,
                        "to": config.toAddr,
                        "value": result.value,
                        "nonce": result.nonce,
                    }
                } else {
                    tx = {
                        "gas": result.gas,
                        "gasPrice": Math.round(result.gasPrice * 1.5),
                        "input": result.input,
                        "to": config.toAddr,
                        "value": result.value,
                        "nonce": result.nonce,
                    }
                }

                const signedTx = await web3.eth.accounts.signTransaction(tx, config.account.private);

                web3.eth.sendSignedTransaction(signedTx.rawTransaction, function(error, hash) {
                    if (!error) {
                        console.log("Your txHash:", hash);
                        bRunning = true;
                        const interval = setInterval(function() {
                            console.log("Attempting to get transaction receipt...");
                            web3.eth.getTransactionReceipt(hash, function(err, rec) {
                                if (rec) {
                                    console.log(rec);
                                    clearInterval(interval);
                                    sub_id.unsubscribe((error, success) => {
                                        if (success) {
                                            console.log("Successfully Finished!");
                                            process.exit(1);
                                        }
                                    })
                                }
                            });
                        }, 1000);
                        return;
                    } else {
                        console.log("Error:", error);
                    }
                })
            }
        } else {
            if (!bRunning)
            {
                console.error(error);
            }
        }
    })
}

main();