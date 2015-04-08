/*jslint nomen: true*/
/*global Blob, btoa*/
(function (jIO, QUnit, Blob, btoa) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    ok = QUnit.ok,
    expect = QUnit.expect,
    deepEqual = QUnit.deepEqual,
    equal = QUnit.equal,
    module = QUnit.module;

  /////////////////////////////////////////////////////////////////
  // Custom test substorage definition
  /////////////////////////////////////////////////////////////////
  function Storage200() {
    return this;
  }
  jIO.addStorage('documentstorage200', Storage200);

  /////////////////////////////////////////////////////////////////
  // documentStorage.constructor
  /////////////////////////////////////////////////////////////////
  module("documentStorage.constructor");
  test("create substorage", function () {
    var jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstorage200"
      }
    });

    ok(jio.__storage._sub_storage instanceof jio.constructor);
    equal(jio.__storage._sub_storage.__type, "documentstorage200");

  });

  /////////////////////////////////////////////////////////////////
  // documentStorage.get
  /////////////////////////////////////////////////////////////////
  module("documentStorage.get");

  test("document without attachment", function () {
    stop();
    expect(4);

    function StorageGetNoAttachment() {
      return this;
    }
    StorageGetNoAttachment.prototype.getAttachment = function (id, name) {
      equal(id, "foo", "getAttachment bar");
      equal(name, "jio_document/YmFy.json", "getAttachment bar");
      return new Blob([JSON.stringify({
        title: name,
        id: "ID " + name,
        "another": "property"
      })]);
    };
    StorageGetNoAttachment.prototype.get = function (id) {
      equal(id, "foo", "Get foo");
      return {
        title: id,
        id: "ID " + id,
        "another": "property"
      };
    };

    jIO.addStorage('documentstoragegetnoattachment', StorageGetNoAttachment);

    var jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstoragegetnoattachment"
      }
    });

    jio.get("bar")
      .then(function (result) {
        deepEqual(result, {
          title: "jio_document/YmFy.json",
          id: "ID jio_document/YmFy.json",
          "another": "property"
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("document with attachment", function () {
    stop();
    expect(4);

    function StorageGetWithAttachment() {
      return this;
    }
    StorageGetWithAttachment.prototype.getAttachment = function (id, name) {
      equal(id, "foo", "getAttachment bar");
      equal(name, "jio_document/YmFy.json", "getAttachment bar");
      return new Blob([JSON.stringify({
        title: name,
        id: "ID " + name,
        "another": "property"
      })]);
    };
    StorageGetWithAttachment.prototype.get = function (id) {
      equal(id, "foo", "Get foo");
      var result = {
        title: id,
        id: "ID " + id,
        "another": "property",
        "_attachments": {
          "foo1": {}
        }
      };
      // matching result
      result._attachments['jio_attachment/' + btoa("bar") + "/" +
                          btoa("bar1")] = {};
      // not matching result
      result._attachments['PREFIXjio_attachment/' + btoa("bar") + "/" +
                          btoa("bar2")] = {};
      result._attachments['jio_attachment/' + btoa("bar") + "/" + btoa("bar3")
                          + "/SUFFIX"] = {};
      result._attachments['jio_attachment/ERROR/' + btoa("bar4")] = {};
      result._attachments['jio_attachment/' + btoa("bar") + "/ERROR"] = {};
      result._attachments['jio_document/' + btoa("bar") + '.json'] = {};
      return result;
    };

    jIO.addStorage('documentstoragegetwithattachment',
                   StorageGetWithAttachment);

    var jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstoragegetwithattachment"
      }
    });

    jio.get("bar")
      .then(function (result) {
        deepEqual(result, {
          title: "jio_document/YmFy.json",
          id: "ID jio_document/YmFy.json",
          "another": "property",
          "_attachments": {
            bar1: {}
          }
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // documentStorage.put
  /////////////////////////////////////////////////////////////////
  module("documentStorage.put");
  test("put called substorage put", function () {
    stop();
    expect(5);

    var jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstorage200"
      }
    });
    Storage200.prototype.putAttachment = function (id, name, blob) {
      equal(blob.type, "application/json", "Blob type is OK");
      equal(id, "foo", "putAttachment 200 called");
      equal(name, "jio_document/YmFy.json", "putAttachment 200 called");

      return jIO.util.readBlobAsText(blob)
        .then(function (result) {
          deepEqual(JSON.parse(result.target.result),
                    {"title": "bartitle"},
                    "JSON is in blob");
          return id;
        });

    };

    jio.put("bar", {"title": "bartitle"})
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
  // documentStorage.remove
  /////////////////////////////////////////////////////////////////
  module("documentStorage.remove");
  test("remove called substorage removeAttachment", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstorage200"
      }
    });
    Storage200.prototype.removeAttachment = function (id, name) {
      equal(id, "foo", "removeAttachment 200 called");
      equal(name, "jio_document/YmFy.json", "removeAttachment 200 called");
      return id;
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
  // documentStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("documentStorage.getAttachment");
  test("getAttachment called substorage getAttachment", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstorage200"
      }
    }),
      blob = new Blob([""]);

    Storage200.prototype.getAttachment = function (id, name) {
      equal(id, "foo", "getAttachment 200 called");
      equal(name, "jio_attachment/YmFy/YmFyMg==", "getAttachment 200 called");
      return blob;
    };

    jio.getAttachment("bar", "bar2")
      .then(function (result) {
        equal(result, blob);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // documentStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("documentStorage.putAttachment");
  test("putAttachment called substorage putAttachment", function () {
    stop();
    expect(4);

    var jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstorage200"
      }
    }),
      blob = new Blob([""]);

    Storage200.prototype.putAttachment = function (id, name, blob2) {
      equal(id, "foo", "putAttachment 200 called");
      equal(name, "jio_attachment/YmFy/YmFyMg==", "putAttachment 200 called");
      deepEqual(blob2, blob, "putAttachment 200 called");
      return "OK";
    };

    jio.putAttachment("bar", "bar2", blob)
      .then(function (result) {
        equal(result, "OK");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // documentStorage.removeAttachment
  /////////////////////////////////////////////////////////////////
  module("documentStorage.removeAttachment");
  test("removeAttachment called substorage removeAttachment", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstorage200"
      }
    });

    Storage200.prototype.removeAttachment = function (id, name) {
      equal(id, "foo", "removeAttachment 200 called");
      equal(name, "jio_attachment/YmFy/YmFyMg==",
            "removeAttachment 200 called");
      return "Removed";
    };

    jio.removeAttachment("bar", "bar2")
      .then(function (result) {
        equal(result, "Removed");
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // documentStorage.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("documentStorage.hasCapacity");
  test("can list documents", function () {
    var jio = jIO.createJIO({
      type: "document",
      sub_storage: {
        type: "documentstorage200"
      }
    });

    ok(jio.hasCapacity("list"));
  });

  /////////////////////////////////////////////////////////////////
  // documentStorage.buildQuery
  /////////////////////////////////////////////////////////////////
  module("documentStorage.buildQuery");

  test("document without attachment", function () {
    stop();
    expect(2);

    function StorageAllDocsNoAttachment() {
      return this;
    }
    StorageAllDocsNoAttachment.prototype.get = function (id) {
      equal(id, "foo", "Get foo");
      return {title: id, id: "ID " + id,
              "another": "property"};
    };

    jIO.addStorage('documentstoragealldocsnoattachment',
                   StorageAllDocsNoAttachment);

    var jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstoragealldocsnoattachment"
      }
    });

    jio.allDocs()
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [],
            total_rows: 0
          }
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  test("filter document's attachment on their name", function () {
    stop();
    expect(2);

    function StorageAllDocsWithAttachment() {
      return this;
    }
    StorageAllDocsWithAttachment.prototype.get = function (id) {
      equal(id, "foo", "Get foo");
      var result = {
        title: id,
        id: "ID " + id,
        "another": "property",
        "_attachments": {
          "foo1": {}
        }
      };
      // matching result
      result._attachments['jio_document/' + btoa("foo2") + '.json'] = {};
      // not matching result
      result._attachments['PREFIXjio_document/' + btoa("foo3") + '.json'] = {};
      result._attachments['jio_document/' + btoa("foo4") + '.jsonSUFFIX'] = {};
      result._attachments['jio_document/ERROR.json'] = {};
      result._attachments['jio_attachment/' + btoa("foo5") + "/" +
                          btoa("bar5")] = {};
      return result;
    };

    jIO.addStorage('documentstoragealldocswithattachment',
                   StorageAllDocsWithAttachment);

    var jio = jIO.createJIO({
      type: "document",
      document_id: "foo",
      sub_storage: {
        type: "documentstoragealldocswithattachment"
      }
    });

    jio.allDocs()
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: [{
              id: "foo2",
              value: {}
            }],
            total_rows: 1
          }
        });
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit, Blob, btoa));