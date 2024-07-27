const data = Array(1_000_000).fill(0).map(() => false);

const list = new Set<WebSocket>();

Deno.serve({
    port: 6969
}, (req) => {
    try {
        const { response, socket } = Deno.upgradeWebSocket(req);

        socket.onmessage = (event) => {
            try {
                if (event.data === "reconnected") {
                    const binaryData = new ArrayBuffer(data.length);
                    const view = new DataView(binaryData);
                    for (let i = 0; i < data.length; i++) {
                        view.setUint8(i, data[ i ] ? 1 : 0);
                    }
                    socket.send(view.buffer);
                    list.add(socket);
                    return;
                }
                if (!event.data.includes(":")) return;
                console.log(event.data);
                const [ index, enabled ] = event.data.split(":");
                const indexNumber = Number(index);
                if (!Number.isNaN(indexNumber) && indexNumber < data.length) {
                    data[ indexNumber ] = Boolean(enabled);
                    for (const client of list) {
                        if (client === socket) continue;
                        console.log("sending");
                        try {
                            client.send(event.data);
                        } catch {
                            //
                        }
                    }
                }
            } catch (error) {
                socket.close(1000, error.message);
            }
        };
        socket.onclose = () => {
            list.delete(socket);
        };
        return response;
    } catch (error) {
        return new Response(error.message, { status: 500 });
    }
});