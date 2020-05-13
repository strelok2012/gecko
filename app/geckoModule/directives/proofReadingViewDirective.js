import {
    h, diff, patch,
    create as createElement
  } from "virtual-dom"
import uuidv4 from 'uuid/v4'
import GeckoEditor from '../utils/geckoEditor'
import { merge } from "diff"

const templateUrl = require('ngtemplate-loader?requireAngular!html-loader!../templates/proofReadingViewTemplate.html')


export const proofReadingViewDirective = ($timeout, eventBus) => {
    return {
        restrict: 'E',
        templateUrl,
        scope: {
            fileIndex: '=',
            regions: '=',
            selectedRegion: '=',
            legend: '=',
            control: '='
        },
        link: (scope, element, attrs) => {
            let vdom, rootNode

            const speakersFilterColor = (speakers) => {
                if (speakers && speakers.length) {
                    const spans = []
                    speakers.forEach(s => {
                        const legendItem = scope.legend.find(l => l.value === s)
                        spans.push(h('span', {
                            style: `color: ${legendItem.color}`
                        }, `${s}`))
                        spans.push(',')
                    })
                    spans.pop()
                    return spans
                } else if (speakers && !speakers.length) {
                    return 'No speaker'
                } else {
                    return ''
                }
            }

            const toMMSS = (seconds) =>{
                return seconds ? new Date(seconds * 1000).toISOString().substr(14, 5) : '00:00'
            }

            const buildVdom = (merged) => {
                const proofreadings = []
                if (merged && merged.length) {
                    for (let i = 0, l = merged.length; i < l; i++) {
                        const editables = []
                        for (let j = 0, lr = merged[i].regions.length; j < lr; j++) {
                            const editable = h('div', {
                                id: merged[i].regions[j].id,
                                className: 'editable-words'
                            })
                            editables.push(editable)
                        }
                        const editablesContainer = h('div', {
                            className: 'col-md-10 proofreading__editable'
                        }, editables)
                        const proofreadingSpeaker = h('p', {
                            className: 'proofreading__speaker'
                        }, speakersFilterColor(merged[i].regions[0].data.speaker))
    
                        const timeStart = toMMSS(merged[i].regions[0].start)
                        const timeEnd = toMMSS(merged[i].regions[merged[i].regions.length - 1].end)
    
                        const proofreadingTiming = h('p', {
                            className: 'proofreading__timing'
                        }, `${timeStart}-${timeEnd}`)
    
                        const proofreadingInfo = h('div', {
                            className: 'col-md-2 proofreading__info'
                        }, [ proofreadingSpeaker, proofreadingTiming ])
    
                        const row = h('div', {
                            className: 'row proofreading__container'
                        }, [ proofreadingInfo, editablesContainer])
                        proofreadings.push(row)
                    }
                }
                return h('div', proofreadings)
            }

            const render = (merged) => {
                const newVdom = buildVdom(merged)
                const patches = diff(vdom, newVdom)
                rootNode = patch(rootNode, patches)
                vdom = newVdom

                for (let i = 0, l = rootNode.children.length; i < l; i++) {
                    const container = rootNode.children[i]
                    const editable = container.children[1]
                    for (let j = 0, ll = editable.children.length; j < ll; j++) {
                        const editableEl = editable.children[j]
                        const id = editableEl.getAttribute('id')
                        const dataId = editableEl.getAttribute('data-region')
                        const editor = new GeckoEditor(editableEl, scope.fileIndex)
                        const region = scope.control.getRegion(editableEl.id)
                        const editableUuid = uuidv4()
                        const checkIsEmpty = () => {
                            if (!editableEl.textContent.trim().length) {
                                editableEl.classList.add('editable-words--outlined')
                            } else {
                                editableEl.classList.remove('editable-words--outlined')
                            }
                        }
                        editor.setRegion(region)
                        editor.resetEditableWords = (uuid) => {
                            if (uuid && uuid === editableUuid) {
                                return
                            }
                            editor.setRegion(region)
                            checkIsEmpty()
                            return
                        }
                        editor.on('wordsUpdated', (newWords) => {
                            region.data.words = newWords
                            eventBus.trigger('regionTextChanged', region.id)
                            checkIsEmpty()
                        })
            
                        editor.on('wordClick', ({ word, event }) => {
                            eventBus.trigger('wordClick', word, event)
                        })
            
                        editor.on('emptyEditorClick', ({ region, event }) => {
                            eventBus.trigger('emptyEditorClick', region, event)
                        })
            
                        editor.on('focus', () => {
                            eventBus.trigger('editableFocus', region, scope.fileIndex)
                        })
                        scope.control.editableWords.set(region.id, editor)
                    }
                    // console.log('editable', editable)
                }
                // console.log(rootNode)
            }

            vdom = buildVdom(scope.regions)
            rootNode = createElement(vdom)
            element[0].appendChild(rootNode)

            scope.$watch('regions', (newVal) => {
                console.log('rerender', newVal)
                render(newVal)
            })
            
            /* eventBus.on('proofReadingScrollToSelected', () => {
                element[0].querySelectorAll('.proofreading--selected').forEach((n) => {
                    if (n) {
                        element[0].parentNode.scrollTop = n.offsetTop - 36
                    }
                })
            })

            const findTopAncestor = (el) => {
                while (!el.classList.contains('proofreading')) {
                    el = el.parentNode
                }
                return el
            }

            scope.setSelected = () => {
                const currentSelected = element[0].querySelectorAll('.proofreading--selected')
                currentSelected.forEach((n) => {
                    n.classList.remove('proofreading--selected')
                })

                if (!scope.selectedRegion) {
                    return
                }

                const regionElement = element[0].querySelector(`[data-region="${scope.selectedRegion.id}"]`)
                if (regionElement) {
                    const topAncestor = findTopAncestor(regionElement)
                    topAncestor.classList.add('proofreading--selected')
                } 
            }

            scope.$watch('selectedRegion', (newVal) => {
                $timeout(() => {
                    scope.setSelected()
                })
            })

            eventBus.on('proofReadingScrollToRegion', (region) => {
                const regionElement = element[0].querySelector(`[data-region="${region.id}"]`)
                if (regionElement) {
                    const topAncestor = findTopAncestor(regionElement)
                    element[0].parentNode.scrollTop = topAncestor.offsetTop - 36
                }
            })

            /* eventBus.on('proofReadingScroll', (region, fileIndex) => {
                if (fileIndex !== scope.fileIndex) {
                    const regionElement = document.querySelector(`[data-region="${region.id}"]`)
                    if (regionElement) {
                        element[0].parentNode.scrollTop = regionElement.offsetTop - 36
                    }
                }
            }) */
        }
    }
}