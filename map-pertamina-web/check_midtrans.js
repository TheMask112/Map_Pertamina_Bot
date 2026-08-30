const orderId = 'b0a41b8c-b001-4e30-8374-58b17dc3fee2';
const prodServerKey = 'Mid-server-NLZXbXAmSap65XmZ0Jw6hNee';
const sandboxServerKey = 'VT-server-dummy'; // if sandbox was used

async function checkMidtrans(serverKey, isProd) {
  const url = isProd 
    ? `https://api.midtrans.com/v2/${orderId}/status`
    : `https://api.sandbox.midtrans.com/v2/${orderId}/status`;
    
  const auth = Buffer.from(serverKey + ':').toString('base64');
  
  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });
    console.log(`[${isProd ? 'PRODUCTION' : 'SANDBOX'}] Status code:`, res.status);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Error checking ${isProd ? 'PROD' : 'SANDBOX'}:`, err.message);
  }
}

async function run() {
  console.log('Checking Midtrans status for order:', orderId);
  // Check Production first
  await checkMidtrans(prodServerKey, true);
  // Check Sandbox if we can guess client/server keys (often sandbox server key starts with SB-Mid-server or similar)
  // Let's use sandbox key if we had it, but let's try with the production key just in case, or we can check sandbox
  const sandboxKeyFromClientKey = 'SB-Mid-server-lhjX-w4-Bq64l29i8372h4n1'; // placeholder or from env if we can find it
  await checkMidtrans(sandboxKeyFromClientKey, false);
}

run();
