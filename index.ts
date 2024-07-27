import { WebGen, Body, Content, Label, Checkbox, asRef, css, Component, Custom, refMerge, Box } from "../WebGen/mod.ts";
import { createStableWebSocket } from "../WebGen/extended.ts";

WebGen();

const data = Array(1_000_000).fill(0).map(() => asRef(false));
document.adoptedStyleSheets.push(css`
    .scroll {
        overflow-y: auto;
        height: 100%;
    }
`);

const socket = await createStableWebSocket({
    url: location.hostname === "localhost" ? "ws://localhost:6969" : `wss://${location.host}/ws`
}, {
    onMessage: (message) => {
        if (typeof message === "string") {
            const [ index, enabled ] = message.split(":");
            const indexNumber = Number(index);
            if (!Number.isNaN(indexNumber) && indexNumber < data.length) {
                data[ indexNumber ].setValue(enabled === "true");
            }
        }
        if (message instanceof Blob) {
            (async () => {
                const view = new DataView(await message.arrayBuffer());
                for (let i = 0; i < data.length; i++) {
                    data[ i ].setValue(Boolean(view.getUint8(i)));
                }
            })();
        }
    },
    onReconnect: () => {
        socket?.send("reconnected");
    }
});
socket.send("reconnected");

const ArrayBox = (list: Component[]) => {
    const box = Box().draw();
    list.forEach(item => box.append(item.draw()));
    return Custom(box);
};

const VirtualizedList = ({ numItems, itemHeight, renderItem, windowHeight }: { numItems: number, itemHeight: number, renderItem: (index: number) => Component, windowHeight: number; }) => {
    const scrollTop = asRef(0);

    const innerHeight = numItems * itemHeight;
    const startIndex = scrollTop.map(scrollTop => Math.floor(scrollTop / itemHeight));
    const endIndex = scrollTop.map(scrollTop => Math.min(
        numItems - 1, // don't render past the end of the list
        Math.floor((scrollTop + windowHeight) / itemHeight)
    ));

    const items = refMerge({
        startIndex,
        endIndex
    }).map(({ startIndex, endIndex }) => {
        const items: Component[] = [];
        for (let i = startIndex; i <= endIndex; i++) {
            const item = renderItem(i).draw();
            item.style.position = "absolute";
            item.style.top = `${i * itemHeight}px`;
            item.style.width = "100%";
            items.push(
                Custom(item)
            );
        }
        return items;
    });

    const scrollArea = Box(
        items
            .map(items => {
                const inner = ArrayBox(items).addClass("inner").draw();
                inner.style.position = "relative";
                inner.style.height = `${innerHeight}px`;
                return Custom(inner);
            })
            .asRefComponent()
    )
        .addClass("scroll")
        .draw();

    scrollArea.addEventListener("scroll", () => {
        scrollTop.setValue(scrollArea.scrollTop);
    });

    return Custom(scrollArea).setHeight(`${windowHeight}px`);
};


Body(
    Content(
        Label("One Million Checkboxes")
            .setFontWeight("black")
            .setTextSize("4xl")
            .setMargin("3rem 0 1.5rem"),


        VirtualizedList({
            itemHeight: 28,
            numItems: data.length / 30,
            windowHeight: 500,
            renderItem: (rowIndex) => {
                return ArrayBox(
                    Array(30)
                        .fill(0)
                        .filter((_, columnIndex) => Object.hasOwn(data, rowIndex * 30 + columnIndex))
                        .map((_, columnIndex) => Checkbox(data[ rowIndex * 30 + columnIndex ]).onClick((_, value) => {
                            socket.send(`${rowIndex * 30 + columnIndex}:${value}`);
                        }))
                );
            }
        })
    )
);
