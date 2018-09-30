'use strict';

class Vector {
	constructor(x = 0, y = 0) {
		this.x = x;
		this.y = y;
	}

	plus(vector) {
		if (vector instanceof Vector) {
			return new Vector(this.x + vector.x, this.y + vector.y);
		}
		throw new Error('Можно прибавлять к вектору только вектор типа Vector');
	}

	times(n = 1) {
		return new Vector(this.x * n, this.y * n);
	}
};

class Actor {
	constructor(
		pos = new Vector(0, 0),
		size = new Vector(1, 1),
		speed = new Vector(0, 0)
	) {
		if (
			(pos && !(pos instanceof Vector)) ||
			(size && !(size instanceof Vector)) ||
			(speed && !(speed instanceof Vector))
		) {
			throw new Error('В качестве аргумента можно передавать только вектор типа Vector');
		}
		this.pos = pos;
		this.size = size;
		this.speed = speed;
	}

	act() {}

	get left() {
		return this.pos.x;
	}

	get top() {
		return this.pos.y;
	}

	get right() {
		return this.pos.x + this.size.x;
	}

	get bottom() {
		return this.pos.y + this.size.y;
	}

	get type() {
		return 'actor';
	}

	isIntersect(actor) {
		if (!(actor instanceof Actor) || !actor) {
			throw new Error('В качестве аргумента необходимо передать объект типа Actor');
		}

		if (actor === this) {
			return false;
		}

		return this.left < actor.right && this.right > actor.left && this.top < actor.bottom && this.bottom > actor.top;
	}
};

class Level {

	constructor(grid = [], actors = []) {
		this.grid = grid;
		this.actors = actors;
		this.player = this.actors.find(actor => actor.type === 'player');
		this.height = this.grid.length;
		this.width = this.grid.reduce((a, b) => {
			return b.length > a ? b.length : a;
		}, 0);
		this.status = null;
		this.finishDelay = 1;
	}

	isFinished() {
		if (this.status !== null && this.finishDelay < 0) {
			return true;
		} else {
		  return false;
		}
	}

	actorAt(actor) {
		if (!(actor instanceof Actor) || !actor) {
			throw new Error(`В качестве аргумента необходимо передать объект типа Actor`);
		}
		
		if (!this.actors) {
      return undefined;
    } else {
      return this.actors.find(currentActor => currentActor.isIntersect(actor));
    }
	}

	obstacleAt(pos, size) {
		if (!(pos instanceof Vector) || !(size instanceof Vector)) {
			throw new Error(`В качестве аргумента можно передавать только вектор типа Vector`);
		}
		const leftBorder = Math.floor(pos.x);
		const rightBorder = Math.ceil(pos.x + size.x);
		const topBorder = Math.floor(pos.y);
		const bottomBorder = Math.ceil(pos.y + size.y);
		
		if (leftBorder < 0 || rightBorder > this.width || topBorder < 0) {
			return 'wall';
		} 
		if (bottomBorder > this.height) {
			return 'lava';
		}
		
		for (let i = topBorder; i < bottomBorder; i++) {
			for (let j = leftBorder; j < rightBorder; j++) {
				let ob = this.grid[i][j];
				if (ob !== undefined) {
					return ob;
				}
			}
		}
	}

	removeActor(actor) {
		this.actors = this.actors.filter(ac => ac !== actor);
	}

	noMoreActors(type) {
		if (this.actors) {
			for (let actor of this.actors) {
				if (actor.type === type) {
					return false;
				}
			}
		}
		return true;
	}

	playerTouched(type, actor) {
		if (this.status === null) {
			if (type === 'lava' || type === 'fireball') {
				this.status = 'lost';
				return this.status;
			}
			if (type === 'coin') {
				this.removeActor(actor);
				if (this.noMoreActors('coin')) {
					this.status = 'won';
				}
			}
		}
	}
};

class LevelParser {
	constructor(dic) {
		this.dic = dic;
	}

	actorFromSymbol(symbol) {
	  if (!symbol) {
      return undefined;
    }
    return this.dic[symbol];
	}

	obstacleFromSymbol(symbol){
		const symbols = { 'x': 'wall', '!': 'lava' };
		return symbols[symbol];
	}

	createGrid(strings = []) {
    return strings.map(item => {
      return item.split('').map(i => {
        return this.obstacleFromSymbol(i);
      });
    });
	}

	createActors(strings = []) {
	  const actors = [];
	  const arr = strings.map(string => string.split(''));
	  
    arr.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (this.dic && this.dic[cell] && typeof this.dic[cell] === 'function') {
          const actor = new this.dic[cell](new Vector(x, y));
          if (actor instanceof Actor) {
            actors.push(actor);
          }
        }
      });
    });
    return actors;
	}

	parse(strings = []) {
		const grid = this.createGrid(strings);
		const actors = this.createActors(strings);
		return new Level(grid, actors);
	}
};

class Player extends Actor {
  constructor(pos) {
    super(pos);
    this.pos = this.pos.plus(new Vector(0, -0.5));
    this.size = new Vector(0.8, 1.5);
    this.speed = new Vector(0, 0);
  }

  get type() {
    return 'player';
  }
}

class Fireball extends Actor {
  constructor(pos = new Vector(0, 0), speed = new Vector(0, 0)) {
    super(pos, new Vector(1, 1), speed);
  }
  
  get type() {
    return 'fireball';
  }
  
  getNextPosition(time = 1) {
    return new Vector(this.pos.x + this.speed.x * time, this.pos.y + this.speed.y * time);
  }
  
  handleObstacle() {
    this.speed.x = -this.speed.x;
    this.speed.y = -this.speed.y;
  }
  
  act(time, level) {
    if (level.obstacleAt(this.getNextPosition(time), this.size)) {
      this.handleObstacle();
    } else {
      this.pos = this.getNextPosition(time);
    }
  }
}

class HorizontalFireball extends Fireball {
  constructor(pos) {
    super(pos);
    this.speed = new Vector(2, 0);
    this.size = new Vector(1, 1);
  }
}

class VerticalFireball extends Fireball {
  constructor(pos) {
    super(pos);
    this.speed = new Vector(0, 2);
    this.size = new Vector(1, 1);
  }
}

class FireRain extends Fireball {
  constructor(pos) {
    super(pos);
    this.speed = new Vector(0, 3);
    this.size = new Vector(1, 1);
    this.currentPos = pos;
  }
  
  handleObstacle() {
    this.pos = this.currentPos;
  }
}

class Coin extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super(pos.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6));
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.spring = Math.random() * Math.PI * 2;
    this.startPos = new Vector(this.pos.x, this.pos.y);
  }
  
  get type() {
    return 'coin';
  }
  
  updateSpring(time = 1) {
    this.spring += this.springSpeed * time;
  }
  
  getSpringVector() {
    return new Vector(0, Math.sin(this.spring) * this.springDist);
  }
  
  getNextPosition(time = 1) {
    this.updateSpring(time);
    return this.startPos.plus(this.getSpringVector());
  }
  
  act(time) {
    this.pos = this.getNextPosition(time);
  }
};

const schemas = [
  [
    '         ',
    '@        ',
    '      =  ',
    '      o  ',
    '     xx  ',
    '         ',
    'x x      ',
    '         '
  ],
  [
    '   |     ',
    '       o ',
    '@        ',
    '      x  ',
    '    o    ',
    '    xo!  ',
    'x    xx  ',
    '         '
  ],
  [
    '            ',
    '     @  |   ',
    ' =         o',
    '        o  x',
    'o    o   x  ',
    '     x      ',
    'x       o   ',
    '            '
  ],
  [
    ' |           ',
    '        v    ',
    '           = ',
    '@   =    o   ',
    '     o   xx  ',
    '     x     o  ',
    'xx     o   x x',
    '       x      '
  ]
];

const actorDict = {
  '@': Player,
  'v': FireRain,
  '=': HorizontalFireball,
  '|': VerticalFireball,
  'o': Coin
};

const parser = new LevelParser(actorDict);

runGame(schemas, parser, DOMDisplay)
  .then(() => console.log('Вы выиграли приз!'));

//loadLevels().then((levels) => {
//    runGame(JSON.parse(levels), parser, DOMDisplay).then(() => alert("Поздравляем! Вы одержали победу!"))
//});
