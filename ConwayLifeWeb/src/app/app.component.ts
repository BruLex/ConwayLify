import {Component, EventEmitter} from '@angular/core';
import {BehaviorSubject, interval, Observable, Subscription} from 'rxjs';
import {WsService} from './websocket/ws.service';

export enum SelectType {
  Selected = 'selected',
  NonSelected = 'nonselected'
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  i: number;
  j: number;
  isMousePressed: boolean = false;
  selectedSelectType: SelectType = SelectType.Selected;
  selectTypeList: SelectType[] = [
    SelectType.Selected,
    SelectType.NonSelected
  ];

  xLines: number[];
  yLines: number[];
  bitmapData: SelectType[][];
  bitmapDataBehaviorSubject: BehaviorSubject<SelectType>[][];

  startTime: number = 0;
  averageTime: number = 0;

  set sizeXY(size: number) {
    this.xLength = size;
    this.yLength = size;
  }
  xLength: number = 200;
  yLength: number = 200;
  workers: number = 4;
  iteration: number = 0;
  sumOfTime: number = 0;

  isStarted: boolean = false;
  private _speed: number = 1;

  private makeUpdate: EventEmitter<void> = new EventEmitter<any>();

  constructor(private ws: WsService) {
    this.makeGridPoints();
    this.ws.start();
    this.ws.message.subscribe(msg => {
      this.sumOfTime += (performance.now() - this.startTime);
      this.iteration++;
      this.averageTime = this.sumOfTime / this.iteration;
      this.bitmapData = msg['new_game_map'];
      this.applyChanges();
      if (this.isStarted) {
        this.updateConwayGrid();
      }
    });
    this.makeUpdate.subscribe(() => {
      this.updateConwayGrid();
    });
  }

  start() {
    this.makeUpdate.emit();
  }

  toggleActive() {
    if (!this.isStarted) {
      this.start();
    }
    this.isStarted = !this.isStarted;
  }

  private makeGridPoints() {
    this.xLines = new Array(this.xLength).fill(null).map((_, i) => (i));
    this.yLines = new Array(this.yLength).fill(null).map((_, i) => (i));
    this.bitmapData = new Array(
      this.yLength).fill(null).map(() => new Array(this.xLength).fill(SelectType.NonSelected)
    );
    this.bitmapDataBehaviorSubject = new Array(
      this.yLength).fill(null).map(() => new Array(this.xLength).fill(null)
    );
    for (let j = 0; j < this.xLength; j++) {
      for (let i = 0; i < this.yLength; i++) {
          this.bitmapDataBehaviorSubject[i][j] = new BehaviorSubject<SelectType>(SelectType.NonSelected);
      }
    }
  }

  randomFill(numberOfCells: number) {
    while (numberOfCells > 0) {
      this.bitmapData.forEach((rows, j) => rows.forEach((cell, i) => {
        if (!!Math.round(Math.random())) {
          numberOfCells--;
          this.bitmapData[j][i] = SelectType.Selected;
        }
      }));
    }
    this.applyChanges();
  }

  applyChanges() {
    for (let j = 0; j < this.xLength; j++) {
      for (let i = 0; i < this.yLength; i++) {
        if (this.bitmapData[i][j] !== this.bitmapDataBehaviorSubject[i][j].value) {
           this.bitmapDataBehaviorSubject[i][j].next(this.bitmapData[i][j]);
        }
      }
    }
  }

  applySize() {
    this.makeGridPoints();
  }

  clearGrid() {
    this.bitmapData.forEach((row: SelectType[]) =>
      row.forEach((cell: SelectType, j: number) => row[j] = SelectType.NonSelected)
    );
    this.applyChanges();
    this.iteration = 0;
    this.sumOfTime = 0;
  }

  updateConwayGrid() {
    // this.finishW = this.workers;
    this.startTime = performance.now();
    this.ws.send({
      game_map: this.bitmapData,
      workers: this.workers
    });
  }

  onMouseEnter(i: number, j: number) {
    this.i = i;
    this.j = j;
    if (this.isMousePressed && this.bitmapData[i][j] !== this.selectedSelectType) {
      this.bitmapData[i][j] = this.selectedSelectType;
      this.bitmapDataBehaviorSubject[i][j].next(this.selectedSelectType);
    }
  }

  onMouseLeave() {
    this.isMousePressed = false;
    this.i = undefined;
    this.j = undefined;
  }

  onMouseDown(event: MouseEvent) {
    const leftMouseButton = 1;

    event.preventDefault();

    if (event.which === leftMouseButton) {
      this.isMousePressed = true;
      if (this.i != null && this.j != null && this.bitmapData[this.i][this.j] !== this.selectedSelectType) {
        this.bitmapData[this.i][this.j] = this.selectedSelectType;
      }
      this.applyChanges();
    }
  }

  onMouseUp() {
    this.isMousePressed = false;
  }

  onMouseEnterLabel(i: number, j: number) {
    this.i = i;
    this.j = j;
  }

  onLabelClick() {
    if (this.i === null) {
      this.bitmapData.forEach((row: SelectType[]) => {
        if (row[this.j] !== this.selectedSelectType) {
          row[this.j] = this.selectedSelectType;
        }
      });
    } else if (this.j === null) {
      this.bitmapData[this.i].forEach((cell: SelectType, j: number) => {
        if (cell !== this.selectedSelectType) {
          this.bitmapData[this.i][j] = this.selectedSelectType;
        }
      });
    }
  }

  isCellHighlighted(i: number, j: number) {
    return (this.i === i && this.j === j) || (this.i === null && this.j === j) || (this.j === null && this.i === i);
  }
}
