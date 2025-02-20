FROM node 
WORKDIR /app
COPY . .
RUN npm install @azure/arm-compute @azure/identity @azure/ms-rest-nodeauth @azure/arm-resources && node createVM.js .

