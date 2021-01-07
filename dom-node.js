const path = require('path')
const fs = require('fs')



// Getting Html file
const getLocalHTML = (route)=>{
    return fs.readFileSync(route).toString()
}

// Setting innerHtml in the instance
const setInnerHTML = (self = null, options)=>{
    try{
        if(options){
            if(options.route){
                self.route = path.join(__dirname, options.route)
                self.innerHTML = getLocalHTML(self.route)
            }
            else if(options.html || options.isChild){
                self.route = null
                self.innerHTML = options.html
            }
            else{
                throw 'Route or HTML not especified.'
            }  
        }
        else{
            throw 'Options not especified.'
        }   
    }
    catch(err){
        console.log(`StrDOM: ${err}`)
    }
}

const sliceTag = (tag,html)=>{
    let index = html.indexOf(tag)
    if(index === -1){
        return html
    }
    let erase = html.slice(index+tag.length)
    return erase
}

const findAnyTag = (html)=>{
    let key1 = html.indexOf('<')
    let key2 = html.indexOf('>')
    let tag = html.slice(key1, key2+1)
    if(tag.indexOf('!doctype') !== -1 || tag.indexOf('!DOCTYPE')!== -1){
        return findAnyTag(sliceTag(tag,html))
    }
    else if(tag[1] === '/'){
        return ''
    }
    return tag
}

const getNameOfTag = (tag)=>{
    let tagName = tag.trim().split(' ')[0].slice(1)
    if(tagName[tagName.length-1] === '>'){
        tagName = tagName.slice(0,tagName.length-1)
    } 
    return tagName
}

const findTagByName = (tagName, html)=>{
    let index = html.indexOf(`<${tagName}`)
    let indexCloser = html.indexOf(`</${tagName}>`)
    if(index<indexCloser && index !== -1){
        let data = {
            tagFounded: html.slice(index, html.indexOf('>')+1),
            "index": index,
            contentBetween: html.slice(0,index)
        }
        return data
    }
    else{
        let data = {
            tagFounded: html.slice(indexCloser, indexCloser+`</${tagName}>`.length),
            "index": indexCloser,
            contentBetween:  html.slice(0,indexCloser)
        }
        return data
    }
}


const isOpener = (tag)=>{
    if(tag.indexOf('</') !== -1){
        return false
    }
    else{
        return true
    }
}

const getFullTag = (tagName,html)=>{
    let opened = 0
    let erase = ''
    let openTag = false
    let tag = {
    }
    while(!openTag){
        let {tagFounded, index, contentBetween} = findTagByName(tagName, html)
        if(index === -1){
            openTag = true
            break
        }
        else{
            if(opened !== -1){
                erase += contentBetween+tagFounded
                html = html.slice(index+tagFounded.length)
            }
            if(isOpener(tagFounded)){
                opened++
            }
            else{
                opened--
            }
            if(opened === -1){
                erase = erase.slice(0,erase.length-tagFounded.length)
                tag.closerTag = tagFounded
                tag.closerIndex = index
                tag.innerHTML = erase
                break
            }
        }
    }
    if(openTag){
        return {
            isOpen: true
        }
    }
    else{
        return tag
    }
}

// Setting DOM Objects in the instance

const setDOM = (self)=>{
    let html = self.innerHTML
    let openerTag = findAnyTag(html)
    self.openerTag = openerTag
    self.index = html.indexOf(self.openerTag)
    self.tagName = getNameOfTag(self.openerTag)
    let result = getFullTag(self.tagName, sliceTag(self.openerTag,html))
    if(result.isOpen){
        self.fullTag = self.openerTag
        self.innerHTML = ''
    }
    else{
        self.innerHTML = result.innerHTML
        self.closerTag = result.closerTag
        self.closerIndex = result.closerIndex
        self.fullTag = self.openerTag+self.innerHTML+self.closerTag
        html = self.innerHTML
    }
}

// Setting childs
const setChildren = (self)=>{
    self.children = []
    let html = self.innerHTML
    while (findAnyTag(html) && i < 15){
        let newChild = {
            innerHTML: html
        }
        setDOM(newChild)
        html = sliceTag(newChild.fullTag, html)
        self.children.push(new ChildNode(self,newChild))
    }   
}

const setProperties = (self, properties)=>{
    for(let prop in properties){
        self[prop] = properties[prop]
    }
}


class ChildNode{
    constructor(self, properties){
        setProperties(this, properties)
        this.route = self
        this.isChild = true
        if(findAnyTag(this.innerHTML)){
            setChildren(this)
        }
    }
}

class DOMNode{
    constructor(options = null){
        setInnerHTML(this, options)
        if(!this.isChild){
            setDOM(this)
        }
        if(findAnyTag(this.innerHTML)){
            setChildren(this)
        }
    }
}

module.exports = DOMNode