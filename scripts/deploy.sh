npx hardhat run scripts/1_deploy-price-oracle.js --network localhost >> .env
npx hardhat run scripts/2_deploy-demu.js --network localhost >> .env

cat .env | awk 'length {print "VITE_"$0}' > ./demu-ui/.env

rm -rf demu-ui/src/contracts
cp -r artifacts/contracts demu-ui/src/contracts
