/*jslint nomen: true*/
/*global Blob, crypto, Uint8Array, ArrayBuffer*/
(function (jIO, QUnit, Blob) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    ok = QUnit.ok,
    expect = QUnit.expect,
    deepEqual = QUnit.deepEqual,
    equal = QUnit.equal,
    throws = QUnit.throws,
    module = QUnit.module,
    key;

  crypto.subtle.importKey(
    "jwk",
    {
      kty: "oct",
      k: "L6hUS9PdMP5AIxXyiFM0GOBukp0heD5wHPRctvWBcVg",
      alg: "A256GCM",
      ext: true
    },
    {
      name: "AES-GCM"
    },
    true,
    ["encrypt", "decrypt"]
  )
    .then(function (res) {
      key = res;
    });

  /////////////////////////////////////////////////////////////////
  // Custom test substorage definition
  /////////////////////////////////////////////////////////////////
  function Storage200() {
    return this;
  }
  jIO.addStorage('cryptstorage200', Storage200);

  /////////////////////////////////////////////////////////////////
  // CryptStorage.constructor
  /////////////////////////////////////////////////////////////////
  module("CryptStorage.constructor");

  test("create substorage", function () {
    var jio = jIO.createJIO({
      type: "crypt",
      key: key,
      sub_storage: {type : "cryptstorage200"}
    });
    equal(jio.__type, "crypt");
    equal(jio.__storage._sub_storage.__type, "cryptstorage200");
  });

  /////////////////////////////////////////////////////////////////
  // CryptStorage.get
  /////////////////////////////////////////////////////////////////
  module("CryptStorage.get");
  test("get called substorage get", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "crypt",
      key: key,
      sub_storage: {type : "cryptstorage200"}
    });

    Storage200.prototype.get = function (id) {
      equal(id, "bar", "get 200 called");
      return {title: "foo"};
    };

    jio.get("bar")
      .then(function (result) {
        deepEqual(result, {
          "title": "foo"
        }, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // CryptStorage.post
  /////////////////////////////////////////////////////////////////
  module("CryptStorage.post");
  test("post called substorage post", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "crypt",
      key: key,
      sub_storage: {type : "cryptstorage200"}
    });

    Storage200.prototype.post = function (id) {
      equal(id, "bar", "post 200 called");
      return {title: "foo"};
    };

    jio.post("bar")
      .then(function (result) {
        deepEqual(result, {
          "title": "foo"
        }, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // CryptStorage.put
  /////////////////////////////////////////////////////////////////
  module("CryptStorage.put");
  test("put called substorage put", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "crypt",
      key: key,
      sub_storage: {type : "cryptstorage200"}
    });

    Storage200.prototype.put = function (id) {
      equal(id, "bar", "put 200 called");
      return {title: "foo"};
    };

    jio.put("bar")
      .then(function (result) {
        equal(result, "bar");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // CryptStorage.remove
  /////////////////////////////////////////////////////////////////
  module("CryptStorage.remove");
  test("remove called substorage remove", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "crypt",
      key: key,
      sub_storage: {type : "cryptstorage200"}
    });

    Storage200.prototype.remove = function (id) {
      equal(id, "bar", "remove 200 called");
      return {title: "foo"};
    };

    jio.remove("bar")
      .then(function (result) {
        equal(result, "bar");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // CryptStorage.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("CryptStorage.hasCapacity");
  test("hasCapacity return substorage value", function () {
    var jio = jIO.createJIO({
      type: "crypt",
      key: key,
      sub_storage: {type : "cryptstorage200"}
    });

    delete Storage200.prototype.hasCapacity;

    throws(
      function () {
        jio.hasCapacity("foo");
      },
      function (error) {
        ok(error instanceof jIO.util.jIOError);
        equal(error.status_code, 501);
        equal(error.message,
              "Capacity 'foo' is not implemented on 'cryptstorage200'");
        return true;
      }
    );
  });

  /////////////////////////////////////////////////////////////////
  // CryptStorage.buildQuery
  /////////////////////////////////////////////////////////////////
  module("CryptStorage.buildQuery");
  test("buildQuery called substorage buildQuery", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "crypt",
      key: key,
      sub_storage: {type : "cryptstorage200"}
    });

    Storage200.prototype.buildQuery = function (id) {
      equal(id, "bar", "buildQuery 200 called");
      return {title: "foo"};
    };

    jio.buildQuery("bar")
      .then(function (result) {
        deepEqual(result, {
          "title": "foo"
        }, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // CryptStorage.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("CryptStorage.removeAttachment");
  test("removeAttachment called substorage removeAttachment", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "crypt",
      key: key,
      sub_storage: {type : "cryptstorage200"}
    });

    Storage200.prototype.removeAttachment = function (id, name) {
      equal(id, "bar", "removeAttachment 200 called");
      equal(name, "foo", "removeAttachment 200 called");
      return {title: "foo"};
    };

    jio.removeAttachment("bar", "foo")
      .then(function (result) {
        deepEqual(result, {
          "title": "foo"
        }, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // CryptStorage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("CryptStorage.allAttachments");
  test("allAttachments called substorage allAttachments", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "crypt",
      key: key,
      sub_storage: {type : "cryptstorage200"}
    });

    Storage200.prototype.allAttachments = function (id) {
      equal(id, "bar", "allAttachments 200 called");
      return {title: "foo"};
    };

    jio.allAttachments("bar")
      .then(function (result) {
        deepEqual(result, {
          "title": "foo"
        }, "Check document");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // CryptStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("CryptStorage.getAttachment", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "crypt",
        key: key,
        sub_storage: {type : "cryptstorage200"}
      });
    }
  });

  test("return substorage getattachment", function () {
    var id = "/",
      attachment = "stringattachment",
      blob = new Blob(['foo']);

    Storage200.prototype.getAttachment = function (arg1, arg2) {
      equal(arg1, id, "getAttachment 200 called");
      equal(arg2, attachment, "getAttachment 200 called");
      return blob;
    };

    stop();
    expect(3);

    this.jio.getAttachment(id, attachment)
      .then(function (result) {
        equal(result, blob, "Return substorage result");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("return substorage getattachment if decrypt fails", function () {
    var id = "/",
      attachment = "stringattachment",
      blob = new Blob(['foo'], {type: 'application/x-jio-aes-gcm-encryption'});

    Storage200.prototype.getAttachment = function (arg1, arg2) {
      equal(arg1, id, "getAttachment 200 called");
      equal(arg2, attachment, "getAttachment 200 called");
      return blob;
    };

    stop();
    expect(3);

    this.jio.getAttachment(id, attachment)
      .then(function (result) {
        equal(result, blob, "Return substorage result");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("return substorage getattachment if not data url", function () {
    var id = "/",
      attachment = "stringattachment",
      blob = new Blob(['foo'],
                       {type: 'application/x-jio-aes-gcm-encryption'});

    Storage200.prototype.getAttachment = function (arg1, arg2) {
      equal(arg1, id, "getAttachment 200 called");
      equal(arg2, attachment, "getAttachment 200 called");
      return blob;
    };

    stop();
    expect(3);

    this.jio.getAttachment(id, attachment)
      .then(function (result) {
        equal(result, blob, "Return substorage result");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("decrypt blob from aes-gcm", function () {
    var id = "/",
      attachment = "stringattachment",
      value = "azertyuio\npàç_è-('é&",
      tocheck = "data:application/x-jio-aes-gcm-encryption;base64,L3" +
        "LcvzpAlxu8/xd0fW7lPHZs5AP0ncexWoTfH57PCVkvrtp1JoB" +
        "wDzUYO+DHsfjAkzXkxhHHNUmxAtDiiSkRSvcbderS9FfIC7U6" +
        "KoGcqiP3OkEseL9Rd7F+qBwGuuDJyg==",
      blob =  jIO.util.dataURItoBlob(tocheck);


    Storage200.prototype.getAttachment = function (arg1, arg2) {
      equal(arg1, id, "getAttachment 200 called");
      equal(arg2, attachment, "getAttachment 200 called");
      return blob;
    };

    stop();
    expect(6);

    this.jio.getAttachment(id, attachment)
      .then(function (result) {
        ok(result !== blob, "Does not return substorage result");
        ok(result instanceof Blob, "Data is Blob");
        deepEqual(result.type, "text/plain;charset=utf-8",
                  "Check mimetype");

        return jIO.util.readBlobAsText(result);
      })
      .then(function (result) {
        equal(result.target.result, value, "Attachment correctly fetched");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // CryptStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("CryptStorage.putAttachment", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "crypt",
        key: key,
        sub_storage: {type : "cryptstorage200"}
      });
    }
  });

  function decodeAES(blob) {
    return new RSVP.Queue()
      .push(function () {
        return jIO.util.readBlobAsArrayBuffer(blob);
      })
      .push(function (coded) {
        var iv;

        coded = coded.currentTarget.result;
        iv = new Uint8Array(coded.slice(0, 12));
        return crypto.subtle.decrypt({name : "AES-GCM", iv : iv},
                                     key, coded.slice(12));
      })
      .push(function (arr) {

        arr = String.fromCharCode.apply(null, new Uint8Array(arr));
        equal(
          arr,
          "data:text/foo;base64,YXplcnR5dWlvCnDDoMOnX8OoLSgnw6km",
          "Attachment correctly crypted"
        );
        return "ok";
      });
  }

  test("crypt blob to aes-gcm", function () {
    var id = "/",
      attachment = "stringattachment",
      value = "azertyuio\npàç_è-('é&",
      blob = new Blob([value],
                      {type: 'text/foo'});

    Storage200.prototype.putAttachment = function (arg1, arg2, arg3) {
      equal(arg1, id, "putAttachment 200 called");
      equal(arg2, attachment, "putAttachment 200 called");
      ok(true, arg3 !== blob, "putAttachment 200 called");
      ok(arg3 instanceof Blob, "Data is Blob");
      equal(arg3.type, "application/x-jio-aes-gcm-encryption",
            "Check mimetype");
      return decodeAES(arg3);
    };

    stop();
    expect(7);

    this.jio.putAttachment(id, attachment, blob)
      .then(function (result) {
        equal(result, "ok", "Return substorage result");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit, Blob));
