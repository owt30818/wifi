// 1. First, create some dummy devices to delete
async function test() {
    try {
        console.log("Creating dummy devices...");
        const devices = [
            { mac_address: 'DE-AD-BE-EF-00-01', alias: 'DeleteMe 1' },
            { mac_address: 'DE-AD-BE-EF-00-02', alias: 'DeleteMe 2' }
        ];

        await fetch('http://localhost:3000/api/devices/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ devices })
        });

        console.log("Fetching IDs...");
        const res = await fetch('http://localhost:3000/api/devices');
        const all = await res.json();
        const targets = all.filter(d => d.mac_address.startsWith('DE-AD-BE-EF'));
        const ids = targets.map(d => d.id);

        console.log("Target IDs:", ids);

        if (ids.length === 0) {
            console.log("No devices found to delete");
            return;
        }

        console.log("Attempting DELETE...");
        const delRes = await fetch('http://localhost:3000/api/devices/bulk', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });

        console.log("Status:", delRes.status);
        const delJson = await delRes.json();
        console.log("Response:", delJson);

    } catch (err) {
        console.error("Test failed:", err);
    }
}

test();
