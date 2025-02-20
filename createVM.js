'use strict';

const { ClientSecretCredential } = require('@azure/identity');
const { ComputeManagementClient } = require('@azure/arm-compute');
const { ResourceManagementClient } = require('@azure/arm-resources');
const http = require('http');

// Azure credentials and settings
const subscriptionId ='5bf2f50f-19a0-4cb1-82cb-517d7551d1f1';
const clientId = '7a592380-f60f-4eec-aedc-9b79b8f3b948';
const clientSecret = 'T-08Q~tpGDN~apsYOryo8QSPk2s4HNbA1lj0SbF~';
const tenantId = 'ba3d8b17-cd30-450a-989f-71dd62be999f';
const resourceGroupName = 'newrg';
const location = 'Central India';  // Change it to your preferred location

// Authentication
const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
const computeClient = new ComputeManagementClient(credential, subscriptionId);
const resourceClient = new ResourceManagementClient(credential, subscriptionId);

// Define the VM configuration
const vmName = 'vm-with-node-server';
const vmConfig = {
  location: location,
  osProfile: {
    computerName: vmName,
    adminUsername: 'azureuser',
    adminPassword: 'Azureuser@123', // Change this to a secure password
    customData: `#!/bin/bash
    # Install Node.js 8.x
    curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
    sudo apt-get install -y nodejs
    # Install git
    sudo apt-get install -y git
    # Clone and run the sample app
    git clone https://github.com/fhinkel/nodejs-hello-world.git
    cd nodejs-hello-world
    npm start &`
  },
  hardwareProfile: {
    vmSize: 'Standard_B1s', // You can change this to another size as per your requirement
  },
  storageProfile: {
    imageReference: {
      publisher: 'Canonical',
      offer: '0001-com-ubuntu-server-focal',
      sku: '20_04-lts', // Use Ubuntu version of your choice
      version: 'latest',
    },
    osDisk: {
      createOption: 'FromImage',
      managedDisk: {
        storageAccountType: 'Standard_LRS',
      },
    },
  },
  networkProfile: {
    networkInterfaces: [
      {
        id: '/subscriptions/<your-subscription-id>/resourceGroups/<your-resource-group>/providers/Microsoft.Network/networkInterfaces/<your-nic-name>',
        properties: {
          primary: true,
        },
      },
    ],
  },
};

// Create a new VM
async function createVM() {
  try {
    const vmResult = await computeClient.virtualMachines.beginCreateOrUpdateAndWait(
      resourceGroupName,
      vmName,
      vmConfig
    );

    // Get the public IP address of the VM
    const publicIpAddress = vmResult.networkProfile.networkInterfaces[0].id;
    const ipAddress = publicIpAddress.split('/').pop(); // Extracting IP address

    console.log(`Booting new VM with IP http://${ipAddress}...`);

    // Ping the VM to determine when the HTTP server is ready
    let waiting = true;
    const timer = setInterval(
      ip => {
        http
          .get('http://' + ip, res => {
            const statusCode = res.statusCode;
            if (statusCode === 200 && waiting) {
              waiting = false;
              clearTimeout(timer);
              console.log('Ready!');
              console.log(ip);
            }
          })
          .on('error', () => {
            process.stdout.write('.');
          });
      },
      2000,
      ipAddress
    );
  } catch (error) {
    console.error('Error creating VM:', error);
  }
}

createVM();
