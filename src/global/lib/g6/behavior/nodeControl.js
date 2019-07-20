/**
 * Created by OXOYO on 2019/7/17.
 *
 * 节点控制
 */

import G6 from '@antv/g6'
import config from '../config/index'
import utils from '../utils/index'

export default {
  name: 'node-control',
  options: {
    getDefaultCfg () {
      return {
        // 是否在拖拽节点时更新所有与之相连的边
        updateEdge: true,
        // 是否支持在节点上添加文本
        enableNodeLabel: true,
        // 是否支持在边上添加文本
        enableEdgeLabel: true
      }
    },
    getEvents () {
      return {
        'editor:addNode': 'startAddNode',
        'node:mousedown': 'onNodeMousedown',
        'node:mouseup': 'onNodeMouseup',
        'node:dblclick': 'onNodeDblclick',
        'canvas:mouseenter': 'onCanvasMouseenter',
        'canvas:mouseleave': 'onCanvasMouseleave',
        'edge:mouseup': 'onEdgeMouseup',
        'edge:dblclick': 'onEdgeDblclick',
        'mousemove': 'onMousemove',
        'mouseup': 'onMouseup'
      }
    },
    startAddNode (node) {
      let _t = this
      // 初始化数据
      _t.info = {
        type: 'dragNode',
        node: node,
        target: null
      }
      _t.dragNode.status = 'dragNodeToEditor'
    },
    onNodeMousedown (event) {
      let _t = this
      // 初始化数据
      _t.info = {
        type: null,
        node: event.item,
        target: event.target
      }
      if (_t.info.target && _t.info.target._attrs.name) {
        switch (_t.info.target._attrs.name) {
          case 'anchor':
            _t.info.type = 'drawLine'
            break
          case 'shapeControlPoint':
            _t.info.type = 'shapeControl'
            break
        }
      } else {
        _t.info.type = 'dragNode'
      }
      if (_t.info && _t.info.type) {
        _t[_t.info.type].start.call(_t, event)
      }
    },
    onNodeMouseup (event) {
      let _t = this
      if (_t.info && _t.info.type) {
        _t[_t.info.type].stop.call(_t, event)
      }
    },
    onNodeDblclick (event) {
      let _t = this
      if (_t.enableNodeLabel) {
        _t.nodeLabel.create.call(_t, event)
      }
    },
    onCanvasMouseenter (event) {
      let _t = this
      if (_t.info && _t.info.type === 'dragNode') {
        _t[_t.info.type].createDottedNode.call(_t, event)
      }
    },
    onCanvasMouseleave (event) {
      let _t = this
      if (_t.info && _t.info.type === 'dragNode') {
        _t[_t.info.type].stop.call(_t, event)
      }
    },
    onEdgeMouseup (event) {
      let _t = this
      if (_t.info && _t.info.type === 'drawLine') {
        _t[_t.info.type].stop.call(_t, event)
      }
    },
    onEdgeDblclick (event) {
      let _t = this
      if (_t.enableEdgeLabel) {
        _t.edgeLabel.create.call(_t, event)
      }
    },
    onMousemove (event) {
      let _t = this
      if (_t.info && _t.info.type) {
        _t[_t.info.type].move.call(_t, event)
      }
    },
    onMouseup (event) {
      let _t = this
      if (_t.info && _t.info.type === 'dragNode') {
        if (_t.dragNode.status === 'dragNodeToEditor') {
          _t[_t.info.type].createNode.call(_t, event)
        }
      }
    },
    drawLine: {
      isMoving: false,
      currentLine: null,
      start: function (event) {
        let _t = this
        let target
        // 锚点数据
        let anchorPoints = _t.info.node.getAnchorPoints()
        // 处理线条目标点
        if (anchorPoints && anchorPoints.length) {
          // 获取距离指定坐标最近的一个锚点
          target = _t.info.node.getLinkPoint({ x: event.x, y: event.y })
        } else {
          target = _t.info.node
        }
        _t.drawLine.currentLine = _t.graph.addItem('edge', {
          // 起始节点
          source: target,
          // 终止节点/位置
          target: {
            x: event.x,
            y: event.y
          },
          // FIXME label 需支持双击编辑
          label: '',
          attrs: {},
          // FIXME 边的形式需要与工具栏联动
          shape: _t.graph.$X.lineType || 'line',
          startArrow: _t.graph.$X.startArrow || false,
          endArrow: _t.graph.$X.endArrow || false
        })
        _t.drawLine.isMoving = true
      },
      move (event) {
        let _t = this
        if (_t.drawLine.isMoving && _t.drawLine.currentLine) {
          _t.graph.updateItem(_t.drawLine.currentLine, {
            target: {
              x: event.x,
              y: event.y
            }
          })
        }
      },
      stop (event) {
        let _t = this
        if (_t.drawLine.isMoving) {
          if (_t.drawLine.currentLine === event.item) {
            // 画线过程中点击则移除当前画线
            _t.graph.removeItem(event.item)
          } else {
            let endNode = event.item
            let startModel = _t.info.node.getModel()
            let endModel = endNode.getModel()
            let target
            // 锚点数据
            let anchorPoints = endNode.getAnchorPoints()
            // 处理线条目标点
            if (anchorPoints && anchorPoints.length) {
              // 获取距离指定坐标最近的一个锚点
              target = endNode.getLinkPoint({ x: event.x, y: event.y })
            } else {
              target = endNode
            }
            _t.graph.updateItem(_t.drawLine.currentLine, {
              target: target,
              // 存储起始点ID，用于拖拽节点时更新线条
              attrs: {
                start: startModel.id,
                end: endModel.id
              }
            })
          }
        }
        _t.drawLine.currentLine = null
        _t.drawLine.isMoving = false
        _t.info = null
      }
    },
    shapeControl: {
      isMoving: false,
      startPoint: null,
      start (event) {
        let _t = this
        let model = _t.info.node.getModel()
        _t.shapeControl.startPoint = {
          x: model.x,
          y: model.y,
          size: model.size || []
        }
        _t.shapeControl.isMoving = true
      },
      move (event) {
        let _t = this
        if (_t.info.node && _t.info.target && _t.shapeControl.startPoint && _t.shapeControl.isMoving) {
          let model = _t.info.node.getModel()
          // 判断位置
          let targetAttrs = _t.info.target._attrs
          let position = targetAttrs.position
          let attrs = {
            x: _t.shapeControl.startPoint.x,
            y: _t.shapeControl.startPoint.y,
            size: [...model.size]
          }
          let width = model.width
          let height = model.height
          if (position) {
            // 参照点，及当前controller的对角点
            let referencePoint = {}
            if (position.x === 0) {
              if (position.y === 0) {
                referencePoint = {
                  x: _t.shapeControl.startPoint.x + width / 2,
                  y: _t.shapeControl.startPoint.y + height / 2
                }
                // 计算宽、高
                attrs.size[0] = Math.abs(referencePoint.x - event.x)
                attrs.size[1] = Math.abs(referencePoint.y - event.y)
                // 计算中心点坐标
                attrs.x = event.x + attrs.size[0] / 2
                attrs.y = event.y + attrs.size[1] / 2
                if (
                  event.x > _t.shapeControl.startPoint.x ||
                  event.y > _t.shapeControl.startPoint.y ||
                  attrs.size[0] < _t.minWidth ||
                  attrs.size[1] < _t.minHeight
                ) {
                  return
                }
              } else if (position.y === 1) {
                referencePoint = {
                  x: _t.shapeControl.startPoint.x + width / 2,
                  y: _t.shapeControl.startPoint.y - height / 2
                }
                // 计算宽、高
                attrs.size[0] = Math.abs(referencePoint.x - event.x)
                attrs.size[1] = Math.abs(referencePoint.y - event.y)
                // 计算中心点坐标
                attrs.x = event.x + attrs.size[0] / 2
                attrs.y = event.y - attrs.size[1] / 2
                if (
                  event.x > _t.shapeControl.startPoint.x ||
                  event.y < _t.shapeControl.startPoint.y ||
                  attrs.size[0] < _t.minWidth ||
                  attrs.size[1] < _t.minHeight
                ) {
                  return
                }
              }
            } else if (position.x === 1) {
              if (position.y === 0) {
                referencePoint = {
                  x: _t.shapeControl.startPoint.x - width / 2,
                  y: _t.shapeControl.startPoint.y + height / 2
                }
                // 计算宽、高
                attrs.size[0] = Math.abs(referencePoint.x - event.x)
                attrs.size[1] = Math.abs(referencePoint.y - event.y)
                // 计算中心点坐标
                attrs.x = event.x - attrs.size[0] / 2
                attrs.y = event.y + attrs.size[1] / 2
                if (
                  event.x < _t.shapeControl.startPoint.x ||
                  event.y > _t.shapeControl.startPoint.y ||
                  attrs.size[0] < _t.minWidth ||
                  attrs.size[1] < _t.minHeight
                ) {
                  return
                }
              } else if (position.y === 1) {
                referencePoint = {
                  x: _t.shapeControl.startPoint.x - width / 2,
                  y: _t.shapeControl.startPoint.y - height / 2
                }
                // 计算宽、高
                attrs.size[0] = Math.abs(referencePoint.x - event.x)
                attrs.size[1] = Math.abs(referencePoint.y - event.y)
                // 计算中心点坐标
                attrs.x = event.x - attrs.size[0] / 2
                attrs.y = event.y - attrs.size[1] / 2
                if (
                  event.x < _t.shapeControl.startPoint.x ||
                  event.y < _t.shapeControl.startPoint.y ||
                  attrs.size[0] < _t.minWidth ||
                  attrs.size[1] < _t.minHeight
                ) {
                  return
                }
              }
            }
          }
          _t.info.attrs = {
            ...attrs,
            width: attrs.size[0],
            height: attrs.size[1]
          }
          // 当前节点容器
          let group = _t.info.node.getContainer()
          // 更新锚点
          utils.updateAnchor({
            ..._t.info.node.getModel(),
            width: attrs.size[0],
            height: attrs.size[1]
          }, group)
          // 更新shapeControl
          utils.updateShapeControl({
            ..._t.info.node.getModel(),
            width: attrs.size[0],
            height: attrs.size[1]
          }, group)
          // 更新节点
          _t.graph.updateItem(_t.info.node, attrs)
          if (_t.updateEdge) {
            // 更新线条
            utils.updateLine(_t.info.node, _t.graph)
          }
        }
      },
      stop (event) {
        let _t = this
        if (_t.info.node && _t.info.attrs && _t.shapeControl.startPoint && _t.shapeControl.isMoving) {
          let attrs = _t.info.attrs
          // 当前节点容器
          let group = _t.info.node.getContainer()
          // 更新锚点
          utils.updateAnchor({
            ..._t.info.node.getModel(),
            width: attrs.size[0],
            height: attrs.size[1]
          }, group)
          // 更新shapeControl
          utils.updateShapeControl({
            ..._t.info.node.getModel(),
            width: attrs.size[0],
            height: attrs.size[1]
          }, group)
          // 更新节点
          _t.graph.updateItem(_t.info.node, attrs)
        }
        _t.shapeControl.startPoint = null
        _t.shapeControl.isMoving = false
        _t.info = null
      }
    },
    dragNode: {
      dottedNode: null,
      status: null,
      // 虚线框节点样式
      dottedNodeStyle: {
        ...config.dottedNode.style.default
      },
      createDottedNode (event) {
        let _t = this
        if (!_t.dragNode.dottedNode && _t.info.node) {
          let { width, height } = _t.info.node
          let group = _t.graph.get('group')
          _t.dragNode.dottedNode = group.addShape('rect', {
            attrs: {
              ..._t.dragNode.dottedNodeStyle,
              width,
              height,
              x: event.x - width / 2,
              y: event.y - height / 2
            }
          })
          _t.graph.paint()
        }
      },
      createNode (event) {
        let _t = this
        if (_t.dragNode.dottedNode && _t.info.node) {
          let { width, height } = _t.info.node
          let node = {
            ..._t.info.node,
            id: G6.Util.uniqueId(),
            x: event.x,
            y: event.y,
            size: [width, height]
          }
          _t.graph.addItem('node', node)
          _t.dragNode.clear.call(_t)
          _t.graph.paint()
        }
      },
      start (event) {
        let _t = this
        _t.dragNode.createDottedNode.call(_t, event)
        _t.dragNode.status = 'dragNode'
      },
      move (event) {
        let _t = this
        if (_t.dragNode.status === 'dragNodeToEditor') {
          if (_t.dragNode.dottedNode && _t.info.node) {
            let { width, height } = _t.info.node
            _t.dragNode.dottedNode.attr({
              x: event.x - width / 2,
              y: event.y - height / 2
            })
            _t.graph.paint()
          }
        } else if (_t.dragNode.status === 'dragNode') {
          if (_t.info.node) {
            let attrs = {
              x: event.x,
              y: event.y,
              // 拖拽时样式
              style: {}
            }
            // 更新节点
            _t.graph.updateItem(_t.info.node, attrs)
            if (_t.updateEdge) {
              // 更新线条
              utils.updateLine(_t.info.node, _t.graph)
            }
          }
        }
      },
      stop (event) {
        let _t = this
        _t.dragNode.clear.call(_t)
        _t.graph.paint()
      },
      clear () {
        let _t = this
        if (_t.dragNode.dottedNode) {
          _t.dragNode.dottedNode.remove()
          _t.dragNode.dottedNode = null
        }
        _t.dragNode.status = null
        _t.info = null
      }
    },
    nodeLabel: {
      // 节点文本创建
      create (event) {
        let _t = this
        let canvas = _t.graph.get('canvas')
        let node = event.item
        let { id, label, x, y, width, height } = node.getModel()
        const el = canvas.get('el')
        const html = G6.Util.createDom(`<input id="${id}" class="node-text" autofocus value="${label}"></input>`)
        if (html) {
          // 插入输入框dom
          el.parentNode.appendChild(html)
          if (html.focus) {
            html.focus()
          }
          // 更新输入框样式
          G6.Util.modifyCSS(html, {
            display: 'inline-block',
            position: 'absolute',
            left: x - width / 2 + 'px',
            top: y - height / 2 + 'px',
            width: width + 'px',
            height: height + 'px',
            lineHeight: height + 'px',
            textAlign: 'center',
            overflow: 'hidden',
            fontSize: '14px'
          })
          html.addEventListener('blur', function () {
            // 更新节点
            _t.graph.updateItem(node, {
              label: html.value
            })
            // 删除输入框dom
            el.parentNode.removeChild(html)
          })
        }
      }
    },
    edgeLabel: {
      // 节点文本创建
      create (event) {
        let _t = this
        let canvas = _t.graph.get('canvas')
        let edge = event.item
        let { id, label, source, target } = edge.getModel()
        let left
        let top
        let minWidth = 40
        let maxWidth = 100
        let width = 40
        let height = 20
        let distance = Math.abs(target.x - source.x)
        if (distance < minWidth) {
          width = minWidth
        }
        if (distance > maxWidth) {
          width = maxWidth
        }
        // 计算输入框位置
        if (source.x < target.x) {
          left = source.x + distance / 2 - width / 2 + 'px'
        } else {
          left = target.x + distance / 2 - width / 2 + 'px'
        }
        if (source.y < target.y) {
          top = source.y + Math.abs(target.y - source.y) / 2 - height / 2 + 'px'
        } else {
          top = target.y + Math.abs(target.y - source.y) / 2 - height / 2 + 'px'
        }
        const el = canvas.get('el')
        const html = G6.Util.createDom(`<input id="${id}" class="edge-text" autofocus value="${label}"></input>`)
        if (html) {
          // 插入输入框dom
          el.parentNode.appendChild(html)
          if (html.focus) {
            html.focus()
          }
          // 更新输入框样式
          G6.Util.modifyCSS(html, {
            display: 'inline-block',
            position: 'absolute',
            left: left,
            top: top,
            width: width + 'px',
            height: height + 'px',
            lineHeight: height + 'px',
            textAlign: 'center',
            overflow: 'hidden',
            fontSize: '14px'
          })
          html.addEventListener('blur', function () {
            // 更新节点
            _t.graph.updateItem(edge, {
              label: html.value
            })
            // 删除输入框dom
            el.parentNode.removeChild(html)
          })
        }
      }
    }
  }
}
