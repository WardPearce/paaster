declare type FileDropEvent = import("filedrop-svelte/lib/event").FileDropEvent;
declare type FileDropSelectEvent = import("filedrop-svelte/lib/event").FileDropSelectEvent;
declare type FileDropDragEvent = import("filedrop-svelte/lib/event").FileDropDragEvent;
declare namespace svelte.JSX {
    interface HTMLAttributes<T> {
        onfiledrop?: (event: CustomEvent<FileDropSelectEvent> & { target: EventTarget & T }) => void;
        onfiledrop?: (event: CustomEvent<FileDropSelectEvent> & { target: EventTarget & T }) => void;
        onfiledragenter?: (event: CustomEvent<FileDropDragEvent> & { target: EventTarget & T }) => void;
        onfiledragleave?: (event: CustomEvent<FileDropDragEvent> & { target: EventTarget & T }) => void;
        onfiledragover?: (event: CustomEvent<FileDropDragEvent> & { target: EventTarget & T }) => void;
        onfiledialogcancel?: (event: CustomEvent<FileDropEvent> & { target: EventTarget & T }) => void;
        onfiledialogclose?: (event: CustomEvent<FileDropEvent> & { target: EventTarget & T }) => void;
        onfiledialogopen?: (event: CustomEvent<FileDropEvent> & { target: EventTarget & T }) => void;
        onwindowfiledragenter?: (event: CustomEvent<FileDropDragEvent> & { target: EventTarget & T }) => void;
        onwindowfiledragleave?: (event: CustomEvent<FileDropDragEvent> & { target: EventTarget & T }) => void;
        onwindowfiledragover?: (event: CustomEvent<FileDropDragEvent> & { target: EventTarget & T }) => void;
    }
}
