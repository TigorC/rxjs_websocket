import { Subject, Observer, Observable } from 'rxjs';
import { WebSocketSubject, WebSocketSubjectConfig } from 'rxjs/observable/dom/WebSocketSubject';

class RxWebsocketSubject<T> extends Subject<T> {
  private reconnectionObservable: Observable<number>;
  private wsSubjectConfig: WebSocketSubjectConfig;
  private socket: WebSocketSubject<any>;
  private connectionObserver: Observer<boolean>;
  public connectionStatus: Observable<boolean>;

  defaultResultSelector = (e: MessageEvent) => {
    return JSON.parse(e.data);
  }

  defaultSerializer = (data: any): string => {
    return JSON.stringify(data);
  }

  constructor(
    private url: string,
    private reconnectInterval: number = 5000,
    private reconnectAttempts: number = 10,
    private resultSelector?: (e: MessageEvent) => any,
    private serializer?: (data: any) => string,
    ) {
    super();

    this.connectionStatus = new Observable((observer) => {
      this.connectionObserver = observer;
    }).share().distinctUntilChanged();

    if (!resultSelector) {
      this.resultSelector = this.defaultResultSelector;
    }
    if (!this.serializer) {
      this.serializer = this.defaultSerializer;
    }

    this.wsSubjectConfig = {
      url: url,
      closeObserver: {
        next: (e: CloseEvent) => {
          this.socket = null;
          this.connectionObserver.next(false);
        }
      },
      openObserver: {
        next: (e: Event) => {
          this.connectionObserver.next(true);
        }
      }
    };
    this.connect();
    this.connectionStatus.subscribe((isConnected) => {
      if (!this.reconnectionObservable && typeof(isConnected) == "boolean" && !isConnected) {
        this.reconnect();
      }
    });
  }

  connect(): void {
    this.socket = new WebSocketSubject(this.wsSubjectConfig);
    this.socket.subscribe(
      (m) => {
        this.next(m);
      },
      (error: Event) => {
        if (!this.socket) {
          this.reconnect();
        }
      });
  }

  reconnect(): void {
    this.reconnectionObservable = Observable.interval(this.reconnectInterval)
      .takeWhile((v, index) => {
        return index < this.reconnectAttempts && !this.socket
    });
    this.reconnectionObservable.subscribe(
      () => {
        this.connect();
      },
      null,
      () => {
        this.reconnectionObservable = null;
        if (!this.socket) {
          this.complete();
          this.connectionObserver.complete();
        }
      });
  }

  send(data: any): void {
    this.socket.next(this.serializer(data));
  }
}

let getWsUrl = (s: string): string => {
  let l = window.location;
  return ((l.protocol === "https:") ? "wss://" : "ws://") + l.host + l.pathname + s;
}
let randomId = Math.random().toString(36).substr(2, 5); // random id

let wsSubject = new RxWebsocketSubject(getWsUrl('ws') + `?uid=${randomId}`);

let textareaLog: HTMLTextAreaElement = <HTMLTextAreaElement>document.getElementById('connectionLog');
let sendMsgBtn: HTMLButtonElement = <HTMLButtonElement>document.getElementById('sendMessageButton');
let clickCount: number = 0;

let addLogMessage = (msg: string): void => {
  textareaLog.value += `${msg}\n`;
  textareaLog.scrollTop = textareaLog.scrollHeight;
}

Observable.fromEvent(sendMsgBtn, 'click').subscribe((e) => {
  clickCount += 1;
  wsSubject.send(String(clickCount));
});

wsSubject.subscribe(
  function(e) {
    addLogMessage(`Message from server: "${e}"`);
  },
  function(e) {
    console.log('Unclean close', e);
  },
  function() {
    console.log('Closed');
  }
);

wsSubject.connectionStatus.subscribe((isConnected) => {
  textareaLog.disabled = sendMsgBtn.disabled = !isConnected;
  let msg = isConnected? 'Server connected': 'Server disconnected';
  addLogMessage(msg);
});
