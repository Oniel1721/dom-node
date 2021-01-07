const path = require('path')
const fs = require('fs')



// Getting Html file
const getLocalHTML = (route)=>{
    return fs.readFileSync(route).toString()
}
const replaceAll = (str = '', searchFor = '', replaceWith = '')=>{
    while(str.indexOf(searchFor)!== -1){
        str = str.replace(searchFor,replaceWith)
    }
    return str
}

// Setting innerHtml in the instance
const setInnerHTML = (self = null, options)=>{
    try{
        if(options){
            if(options.route){
                self.route = path.join(__dirname, options.route)
                self.innerHTML = replaceAll(replaceAll(getLocalHTML(self.route), '\r\n'),'  ')
            }
            else if(options.html || options.isChild){
                self.route = null
                self.innerHTML = replaceAll(replaceAll(options.html, '\r\n'),'  ')
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

const tagValidation = (tag)=>{
    let splited = tag.split(' ')
    let valid = false
    if(splited[0].indexOf('!doctype') !== -1 || splited[0].indexOf('!DOCTYPE')!== -1){
        valid = true
    }
    else if(splited[0].indexOf('!--') !== -1){
        valid = true
    }
    else if(splited[0].indexOf('script') !== -1){
        valid = true
    }
    else if(splited[0].indexOf('noscript') !== -1){
        valid = true
    }
    else if(splited[0].indexOf('style') !== -1){
        valid = true
    }
    return valid
}

const findAnyTag = (html)=>{
    let key1 = html.indexOf('<')
    let key2 = html.indexOf('>')
    let tag = html.slice(key1, key2+1)
    if(tagValidation(tag)){
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
    while (findAnyTag(html)){
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

const getTree = (doc, tree = {})=>{
    let i = 2
    let currentName = doc.tagName
    if(tree[doc.tagName]){
        let validation = tree[`${doc.tagName}${i}`]
        while(validation){
            i++
            validation = tree[`${doc.tagName}${i}`]
        }
        currentName = `${doc.tagName}${i}`
        tree[currentName] = {}
    }
    else{
        tree[currentName] = {}
    }
    if(doc.children){
        doc.children.forEach(child=>{
        tree[currentName] = getTree(child, tree[currentName])
        })
    }
    else{
        if(doc.innerHTML){
            tree[currentName].content = doc.innerHTML
        }
        else{
            tree[currentName].content = doc.openerTag
        }
    }
    return tree
}

const atributteValidation = (str = '')=>{
    str = str.trim()
    if(str === ' '){
        return true
    }
    if(!str){
        return true
    }
    if(str === '/'){
        return true
    }
    return false
}

const setAtributtes = (self)=>{
    let openerTag = self.openerTag.slice(self.openerTag.indexOf(' '),self.openerTag.length-1).trim()
    if(openerTag[openerTag.length-1] === '/'){
        openerTag = openerTag.slice(0,openerTag.length-1)
    }
    if(openerTag){
        openerTag = openerTag.split('=')
        console.log(openerTag)
    }
}

class ChildNode{
    constructor(self, properties){
        setProperties(this, properties)
        this.route = self
        this.isChild = true
        // setAtributtes(this)
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
            // setAtributtes(this)
        }
        if(findAnyTag(this.innerHTML)){
            setChildren(this)
        }
        this.tree = getTree(this)
    }
}

module.exports = DOMNode