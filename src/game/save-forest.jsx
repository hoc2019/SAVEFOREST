import React from 'react';
import question from '../question';
import styles from './save-forest.less';

class SaveForest extends React.Component{
	constructor(props){
		super(props);
		const gameAreaStyle = { width : 900 , height : 500 , fontSize : 20 , getBarHeight : function(rate){ return this.fontSize * (rate || 3) } };
		this.state = {
			inputValue : undefined,
			level : 'hard',
			qsWordQueue : [],			//问题单词数组
			qsIndex : 0,				//问题单词索引
			qsSpeed : 15,				//问题单词下降速度
			anWordQueue : [],			//回答单词数组
			anIndex : 0,				//答案单词索引
			anSpeed : -25,				//答案单词上升速度
			wordWidth : 12,				//每个字母的宽度
			gameAreaStyle,				//游戏区域样式类
			initTime : 10,				//计时初始秒数
			time : undefined,			//计时
			initScore : { num : 0 , count : 0 },				//得分初始化对象
			score : {},					//得分
			RenderWord : function(props){
				this.label = props && props.label || '';
				this.style = props && props.style || {};
				this.className = props && props.className;
				this.key = props && props.key;
				this.x = props && props.x;
				this.y = props && props.y;
				this.interval = props && props.interval;
				this.width = props && props.width;
				this.setTimeout = props && props.setTimeout;
				this.clearTimeout = function(){
					if(this.setTimeout){
						clearTimeout(this.setTimeout);
						this.setTimeout = undefined;
					}
				}
				this.render = function(){
					let width = gameAreaStyle.fontSize * this.label.length;
					return (<div style = {{ ...this.style , transform : `translate(${this.x}px, ${this.y}px)` , width , fontSize : gameAreaStyle.fontSize }} className = { this.className } key = { this.key }>{ this.label }</div>)
				}
			},
		}
	}

	//点击开始游戏
	startGame(){
		//开始计时 开始添加问题单词
		this.timing(() => this.addQsWord());
	}

	//获取两个区间内的随机整数
	calc({ min, max }){
		return Math.round(Math.random() * (max - min) + min);
	}

	getPosition(){
		let { gameAreaStyle } = this.state;
		//范围从10~(width-100)
		let min = 10;
		let max = gameAreaStyle.width - 100;
		return this.calc({ min, max });
	}

	//判断是否存在数组中的x值是否存在
	isSameX(x, array){
		let flag = false;
		for(let i = 0 ; i < array.length ; i++){
			if(x === array[i].x){
				flag = true;
			}
		}
		return flag
	}

	//计时事件
	timing(initCallback){
		let { initTime , time , qsWordQueue , anWordQueue , initScore , score } = this.state;
		//flag为true说明是计时开始
		if(initCallback){
			this.setState({ time : initTime , score : initScore }, () => {
				typeof initCallback === 'function' && initCallback();
				//获取input焦点
				this.refs.input.focus();
				this.timing();
			})
		}else if(time > 0){
			this.setState({ time : this.state.time - 1 }, () => {
				let t = setTimeout(() => {
					clearTimeout(t);
					this.timing();
				}, 1000)
			})
		}else{
			function clear(arr){
				for(let i = 0 ; i < arr.length ; i++){
					arr[i].clearTimeout();
				}
			}
			//时间到，清空相应数据
			clear(qsWordQueue);
			clear(anWordQueue);
			this.refs.input.value = '';
			this.setState({ qsWordQueue : [] , anWordQueue : [] , qsIndex : 0 , anIndex : 0 , inputValue : undefined }, () => {
				window.alert('time out!')
			})
		}
	}

	//添加问题单词
	addQsWord(){
		let { qsIndex , level , qsWordQueue , RenderWord , gameAreaStyle , time } = this.state;
		//说明游戏结束，则不增加新的元素
		if(!time || time <= 0){
			return;
		}
		let x = this.getPosition();
		//如果已存在的问题数组中有已存在元素有相同的x值，则x重新取值
		while(this.isSameX(x, qsWordQueue)){
			x = this.getPosition()
		}
		let y = 0;
		let diff = question[level];
		//从数据中随机取一个出来
		let label = diff.data[this.calc({ min : 0, max : diff.data.length })];
		let div = new RenderWord({ label , x , y , className : styles.word , key : qsIndex++ , interval : diff.fall });
		//将该元素push到渲染队列中
		qsWordQueue.push(div);
		this.setState({ qsWordQueue , qsIndex }, () => {
			this.initTask('qsWordQueue', div);
			let t = setTimeout(() => { clearTimeout(t); this.addQsWord(); }, this.calc(diff.showNext));
		});
	}

	//添加答案单词
	addAnWord(props, qsItem){
		let { anIndex , anWordQueue , RenderWord , gameAreaStyle } = this.state;
		let { label , x , interval } = props;
		let y = gameAreaStyle.height - gameAreaStyle.getBarHeight(5);
		let div = new RenderWord({ label , x , y , className : styles.word , key : anIndex++ , interval : interval || 200 });
		anWordQueue.push(div);
		this.setState({ anWordQueue , anIndex }, () => {
			this.initTask('anWordQueue', div);
			this.isKnock(div, qsItem)
		})
	}

	//初始化每个单词的任务，给每个字母添加定时器
	initTask(key, item){
		let { gameAreaStyle , qsWordQueue , anWordQueue , qsSpeed , anSpeed } = this.state;
		let obj = {};
		let speed, resolve, reject = {};
		let self = this;
		//数组赋值并不需要深拷贝，因为比对的是唯一值key
		if(key === 'qsWordQueue'){
			obj[key] = qsWordQueue;
			speed = qsSpeed;
			//问题单词到底最底部临界值判断条件
			reject.condition = (item) => (item.y >= (gameAreaStyle.height - gameAreaStyle.getBarHeight(5)));
		}
		if(key === 'anWordQueue'){
			obj[key] = anWordQueue;
			speed = anSpeed;
			//答案单词到达顶部临界值判断条件
			reject.condition = (item) => (item.y <= 0);
		}
		//已达到单词临界条件时执行的回调
		reject.callback = (item, obj) => {
			for(let i = 0 ; i < obj[key].length ; i++){
				if(obj[key][i].key === item.key){
					//清除定时器
					item.clearTimeout();
					obj[key].splice(i, 1);
					break;
				}
			}
			this.setState(obj);
		}
		//未达到单词消失临界条件执行的回调
		resolve = (item, speed, obj) => {
			item.y = item.y + speed;
			//更新公屏，页面效果就是使问题单词下降 或者 答案单词上升
			this.setState(obj, () => {
				item.setTimeout = setTimeout(() => timeout(item, speed, resolve, reject, obj), item.interval)
			})
		};

		//定义执行定时器方法名，用setTimeout代替setInterval，setTimeout循环调用
		function timeout(item, speed, resolve, reject, obj){
			let { time } = self.state;
			if((reject && reject.condition(item)) || !time || time <= 0){
				reject.callback && reject.callback(item, obj);
			}else{
				resolve && resolve(item, speed, obj);
			}
		}

		//为当前元素增加定时器事件
		item.setTimeout = setTimeout(() => timeout(item, speed, resolve, reject, obj), item.interval);
	}

	//判断答案单词和问题单词是否碰撞
	isKnock(anItem, qsItem){
		let { gameAreaStyle , qsWordQueue , anWordQueue , score } = this.state;
		//对比两者的interval，取其中小的值作为定时器来检查两个元素碰撞情况
		let interval = Math.min(anItem.interval, qsItem.interval);
		//碰撞条件
		let isKnocked = Math.abs(anItem.y - qsItem.y) <= gameAreaStyle.fontSize;
		if(isKnocked){
			//由于数组操作的异步性，如果用数组中每一项的索引来判断，可能会定位不准确
			//便利中对比key值来确保唯一性
			for(let i = 0 ; i < qsWordQueue.length ; i++){
				if(qsItem.key === qsWordQueue[i].key){
					qsWordQueue.splice(i, 1);
					break;
				}
			}
			for(let i = 0 ; i < anWordQueue.length ; i++){
				if(anItem.key === anWordQueue[i].key){
					anWordQueue.splice(i, 1);
					break;
				}
			}
			score.count += 1;
			score.num += anItem.label.length
			this.setState({ qsWordQueue , anWordQueue , score });
		}else{
			let t = setTimeout(() => { clearTimeout(t); this.isKnock(anItem, qsItem) }, interval)
		}
	}

	keyDown(e){
		if(e && e.keyCode === 13){
			let { inputValue , qsWordQueue } = this.state;
			let x = undefined;
			this.refs.input.value = '';
			for(let i = 0 ; i < qsWordQueue.length ; i++){
				if(inputValue === qsWordQueue[i].label){
					x = qsWordQueue[i].x;
					this.addAnWord({ label : inputValue , x }, qsWordQueue[i])
					break;
				}
			}
			this.setState({ inputValue : undefined , qsWordQueue })
		}
	}

	inputChange(e){
		this.setState({ inputValue : e.target.value })
	}

	render(){
		let { inputValue , qsWordQueue , anWordQueue , gameAreaStyle , time , score } = this.state;
		return(
			<div className = { styles.all }>
				<div className = { styles.game }>
					<div className = { styles.game_area } style = { gameAreaStyle }>
						{ qsWordQueue && qsWordQueue.map((item, index) => item.render()) }
						{ anWordQueue && anWordQueue.map((item, index) => item.render()) }
						<div className = { styles.bar } style = {{ height : gameAreaStyle.getBarHeight(3) , left : 0 , bottom : 0 , fontSize : gameAreaStyle.fontSize }}>
							{ inputValue }
						</div>
					</div>
					<input className = { styles.word_input } type = 'text' ref = 'input' onKeyDown = {(e) => this.keyDown(e)} placeholder = '请在这里输入单词，回车键提交' onChange = {(e) => this.inputChange(e)} disabled = { !time || time <= 0 }/>
					<button onClick = {() => this.startGame()} disabled = { !!time || time > 0 }>开始游戏</button>
				</div>
				<div className = { styles.result } style = {{ ...gameAreaStyle, width : 200 }}>
					<div className = { styles.result_title }>RESULT</div>
					<div className = { styles.result_data }>
						<div>Time</div>
						<div>{ time }</div>
					</div>
					<div className = { styles.result_data }>
						<div>Score</div>
						<div>{ score.count }</div>
						<div>{ score.num }</div>
					</div>
				</div>
			</div>
		)
	}
}

export default SaveForest;
