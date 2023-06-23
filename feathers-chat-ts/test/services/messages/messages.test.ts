// For more information about this file see https://dove.feathersjs.com/guides/cli/service.test.html
import assert from 'assert'
import { app } from '../../../src/app'
import chai, { expect } from 'chai'
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised';
import { Server } from 'http';
import { Message, MessageData } from '../../../src/client';
import { User, UserData } from '../../../src/services/users/users'

const port = app.get('port');
chai.use(chaiHttp)
chai.use(chaiAsPromised)

describe('messages service', () => {
  let server: Server

  before(async () => {
    server = await app.listen(port)
  })

  it('registered the service', async () => {
    const service = app.service('messages')

    assert.ok(service, 'Registered the service')

    await app.teardown()
  })

  it('401s if not authenticated', async () => {
    const messageData: MessageData = {
      text: "abc"
    }

    const response = await chai.request(server)
        .post("/messages")
        .send(messageData)

    expect(response).to.have.status(401)
  })
})

describe('messages service (authenticated)', () => {
  let server: Server
  let accessToken: string
  let user: User
  let requester: ChaiHttp.Agent

  before(async () => {
    server = await app.listen(port)
    requester = chai.request(server).keepOpen()

    const userData: UserData = {
      email: 'should@create.com',
      password: 'supersecret'
    }

    user = await app.service('users').create(userData)

    const authData = {
      "strategy": "local",
      ...userData
    }

    const response = await requester
        .post("/authentication")
        .send(authData);

    ({ accessToken } = response.body)
  })

  after(async () => {
    await app.service('users').remove(user!.id)
    await app.teardown()
  })

  it('creates message', async () => {
    const messageData: MessageData = {
      text: "abc"
    }

    const response = await requester
        .post("/messages")
        .send(messageData)
        .auth(accessToken, {type: 'bearer'})

    expect(response).to.have.status(201)
    expect(response.body.text).to.equal("abc")
    expect(response.body.userId).to.equal(user.id)
  })

  it('patches message', async () => {
    const messageData: MessageData = {
      text: "abc"
    }

    let response = await requester
        .post("/messages")
        .send(messageData)
        .auth(accessToken, {type: 'bearer'})

    response = await requester
        .patch(`/messages/${response.body.id}`)
        .send({text: "updated text"})
        .auth(accessToken, {type: 'bearer'})

    expect(response).to.have.status(200)
    expect(response.body.text).to.equal("updated text")
  })

  it('finds message', async () => {
    const messageData: MessageData = {
      text: "abc"
    }

    await requester
        .post("/messages")
        .send(messageData)
        .auth(accessToken, {type: 'bearer'})

    const response = await requester
        .get("/messages")
        .query({userId: user.id})
        .auth(accessToken, {type: 'bearer'})

    expect(response).to.have.status(200)
    expect(response.body.total).to.be.greaterThan(0)
    expect(response.body.data.every((message: Message) => message.userId === user.id))
        .to.be.true
    expect(response.body.data.some((message: Message) => message.text === "abc"))
        .to.be.true    
  })

  it('deletes message', async () => {
    const messageData: MessageData = {
      text: "abc"
    }

    let response = await requester
        .post("/messages")
        .send(messageData)
        .auth(accessToken, {type: 'bearer'})

    expect(response).to.have.status(201)
    const messageId = response.body.id

    response = await requester
        .delete(`/messages/${messageId}`)
        .auth(accessToken, {type: 'bearer'})

    
    expect(response).to.have.status(200)
    expect(app.service('messages').get(messageId)).to.eventually.be.rejected
  })
})