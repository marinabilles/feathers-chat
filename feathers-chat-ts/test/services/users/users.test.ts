// For more information about this file see https://dove.feathersjs.com/guides/cli/service.test.html
import assert from 'assert'
import { app } from '../../../src/app'
import type { Server } from 'http'
import chai, { expect } from 'chai'
import chaiHttp from 'chai-http'
import chaiAsPromised from 'chai-as-promised'
import { User, UserData } from '../../../src/services/users/users'

const port = app.get('port');
chai.use(chaiHttp)
chai.use(chaiAsPromised)

function userEqual(user1: User, user2: User, password = true): void {
  expect(user1.id).to.equal(user2.id)
  expect(user1.email).to.equal(user2.email)
  expect(user1.avatar).to.equal(user2.avatar)
  expect(user1.githubId).to.equal(user2.githubId)
  if (password) {
    expect(user1.password).to.equal(user2.password)
  }
}

describe('users service', () => {
  let server: Server

  before(async () => {
    server = await app.listen(port)
  })

  it('registered the service', async () => {
    const service = app.service('users')

    assert.ok(service, 'Registered the service')

    await app.teardown()
  })

  it('401s if not authenticated', async () => {
    const response = await chai.request(server)
        .get("/users")

    expect(response).to.have.status(401)
  })

  it('creates new user', async () => {
    let userService: any;
    let user: User | undefined;
    try {
      const userData: UserData = {
        email: 'should@create.com',
        password: 'supersecret'
      }

      userService = app.service('users')

      user = await userService.create(userData)
      const returned_by_id = await userService.get(user!.id)
      userEqual(user!, returned_by_id)
    } finally {
      if (user) {
        await userService.remove(user!.id)
      }
    }
  })

  it("fails to get if not authenticated", async () => {
    let user: User | undefined;
    try {
      const userData: UserData = {
        email: 'should@create.com',
        password: 'supersecret'
      }

      user = await app.service('users').create(userData)

      const authData = {
        "strategy": "local",
        ...userData
      }

      const response = await chai.request(server)
          .post("/authentication")
          .send(authData)

      expect(response).to.have.status(201)
    } finally {
      if (user) {
        await app.service('users').remove(user!.id)
      }
    }
  })

  it('creates new user without authentication', async () => {
    const userData: UserData = {
      email: 'second@user.com',
      password: 'supersecret'
    }

    let newUser: User | undefined
    try {
      let response = await chai.request(server)
            .post("/users/create")
            .send(userData)

      expect(response).to.have.status(201)
      newUser = response.body
      expect(response.body.email).to.equal(userData.email)

      const returnedUser = await app.service('users').get(newUser!.id)
      userEqual(newUser!, returnedUser, false)
    } finally {
      if (newUser) {
        await app.service('users').remove(newUser!.id)
      }
    }
  })
})

describe('users service (authenticated)', () => {
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

  it('returns user list', async () => {
    const response = await requester
        .get("/users")
        .auth(accessToken, {type: 'bearer'})

    expect(response).to.have.status(200)
    expect(response).to.be.json
    expect(response.body.total).to.equal(1)
    expect(Array.isArray(response.body.data)).to.be.true
    userEqual(response.body.data[0], user, false)
  })

  it('adds new user', async () => {
    const userData: UserData = {
      email: 'second@user.com',
      password: 'supersecret'
    }

    let newUser: User | undefined
    try {
      let response = await requester
          .post("/users")
          .send(userData)

      expect(response).to.have.status(201)
      newUser = response.body
      expect(response.body.email).to.equal(userData.email)

      response = await requester
          .get("/users")
          .auth(accessToken, {type: 'bearer'})

      expect(response).to.have.status(200)
      expect(response).to.be.json
      expect(response.body.total).to.equal(2)
      const returned = response.body.data.find((el: User) => el.id === newUser!.id)
      userEqual(returned, newUser!)
    } finally {
      if (newUser) {
        await app.service('users').remove(newUser!.id)
      }
    }
  })

  it('finds user by email', async () => {
    const response = await requester
        .get("/users")
        .query({email: "should@create.com"})
        .auth(accessToken, {type: 'bearer'})
    
    expect(response).to.have.status(200)
    expect(response).to.be.json
    expect(response.body.total).to.equal(1)
    expect(Array.isArray(response.body.data)).to.be.true
    userEqual(response.body.data[0], user, false)
  })

  it('fails using update', async () => {
    const response = await requester
        .put(`/users/${user.id}`)
        .send({avatar: "avatar-address.example.com"})
        .auth(accessToken, {type: 'bearer'})

    expect(response).to.have.status(405)
  })

  it('updates avatar with patch', async () => {
    const response = await requester
        .patch(`/users/${user.id}`)
        .send({avatar: "avatar-address.example.com"})
        .auth(accessToken, {type: 'bearer'})

    expect(response).to.have.status(200)
    expect(response.body.avatar).to.equal("avatar-address.example.com")
  })

  it('removes user', async () => {
    const userData: UserData = {
      email: 'second@user.com',
      password: 'supersecret'
    }

    let response = await requester
          .post("/users")
          .send(userData)
    
    const newUser = response.body

    const authData = {
      "strategy": "local",
      ...userData
    }

    response = await requester
        .post("/authentication")
        .send(authData)

    // we need a new token since a user can only delete itself
    const newAccessToken = response.body.accessToken
  
    response = await requester
        .delete(`/users/${newUser.id}`)
        .auth(newAccessToken, {type: 'bearer'})

    expect(response).to.have.status(200)
    expect(app.service('users').get(newUser.id)).to.eventually.be.rejected
  })
})