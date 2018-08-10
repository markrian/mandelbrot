export interface RowJob {
    row: number;
    realMin: number;
    realMax: number;
    iterations: number;
    imag: number;
    width: number;
}

export interface PendingRowJob extends RowJob {
    id: number;
}

export interface CompletedRowJob extends PendingRowJob {
    counts: number[];
}

export interface FromWorkerMessageEvent extends MessageEvent {
    target: Worker;
    data: CompletedRowJob;
}

export interface ToWorkerMessageEvent extends MessageEvent {
    data: PendingRowJob;
}

export type Coords = {
    x: number;
    y: number;
}

export type Complex = {
    real: number;
    imag: number;
}