// Node 18+ has native fetch

const TOTAL_DEVICES = 700;
const BATCH_SIZE = 50;

const generateDevices = () => {
    return Array.from({ length: TOTAL_DEVICES }, (_, i) => {
        // Encode i into hex for the last 3 octets
        const hex = i.toString(16).toUpperCase().padStart(6, '0');
        const p1 = hex.substring(0, 2);
        const p2 = hex.substring(2, 4);
        const p3 = hex.substring(4, 6);

        return {
            mac_address: `BB-BB-BB-${p1}-${p2}-${p3}`,
            alias: `Load Test ${i + 1}`,
            allowed_ssids: null
        };
    });
};

async function seed() {
    const allDevices = generateDevices();
    console.log(`Prepared ${allDevices.length} devices.`);

    for (let i = 0; i < allDevices.length; i += BATCH_SIZE) {
        const batch = allDevices.slice(i, i + BATCH_SIZE);
        console.log(`Sending batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(TOTAL_DEVICES / BATCH_SIZE)} (${batch.length} devices)...`);

        try {
            const response = await fetch('http://localhost:3000/api/devices/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ devices: batch })
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`   > Success: ${data.results?.success}, Failed: ${data.results?.failed}`);
                if (data.results?.errors?.length > 0) {
                    console.log(`   > Errors:`, data.results.errors.slice(0, 3), '...');
                }
            } else {
                console.error(`   > HTTP Error: ${response.status}`);
            }
        } catch (err) {
            console.error("   > Batch failed:", err.message);
        }
    }
    console.log("Seeding complete.");
}

seed();
