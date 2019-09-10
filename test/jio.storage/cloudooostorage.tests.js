/*
 * Copyright 2018, Nexedi SA
 *
 * This program is free software: you can Use, Study, Modify and Redistribute
 * it under the terms of the GNU General Public License version 3, or (at your
 * option) any later version, as published by the Free Software Foundation.
 *
 * You can also Link and Combine this program with other software covered by
 * the terms of any of the Free Software licenses or any of the Open Source
 * Initiative approved licenses and Convey the resulting work. Corresponding
 * source of such a combination shall include the source code for all other
 * software used.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *
 * See COPYING file for full licensing terms.
 * See https://www.nexedi.com/licensing for rationale and options.
 */

/*jslint nomen: true*/
/*global jIO, Blob, sinon, DOMParser, XMLSerializer*/
(function (jIO, Blob, sinon, DOMParser, XMLSerializer) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    ok = QUnit.ok,
    expect = QUnit.expect,
    deepEqual = QUnit.deepEqual,
    equal = QUnit.equal,
    module = QUnit.module,
    throws = QUnit.throws,
    cloudooo_url = 'https://www.exemple.org/',
    parser = new DOMParser(),
    serializer = new XMLSerializer();

  /////////////////////////////////////////////////////////////////
  // Custom test substorage definition
  /////////////////////////////////////////////////////////////////

  function Storage200() {
    return this;
  }
  jIO.addStorage('cloudooostorage200', Storage200);

  /////////////////////////////////////////////////////////////////
  // cloudoooStorage.constructor
  /////////////////////////////////////////////////////////////////

  module("cloudoooStorage.constructor");

  test("create substorage", function () {
    var jio = jIO.createJIO({
      type: "cloudooo",
      url: cloudooo_url,
      sub_storage: {
        type: 'cloudooostorage200'
      }
    });

    equal(jio.__type, "cloudooo");
    equal(jio.__storage._url, cloudooo_url);
    equal(jio.__storage._sub_storage.__type, "cloudooostorage200");
  });

  /////////////////////////////////////////////////////////////////
  // cloudoooStorage.get
  /////////////////////////////////////////////////////////////////

  module("cloudoooStorage.get");
  test("get called substorage get", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "cloudooo",
      url: cloudooo_url,
      sub_storage: {
        type: 'cloudooostorage200'
      }
    });

    Storage200.prototype.get = function (param) {
      equal(param, "bar", "get 200 called");
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
  // cloudoooStorage.put
  /////////////////////////////////////////////////////////////////

  module("cloudoooStorage.put");
  test("put called substorage put", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "cloudooo",
      url: cloudooo_url,
      sub_storage: {
        type: 'cloudooostorage200'
      }
    });
    Storage200.prototype.put = function (id, param) {
      equal(id, "bar", "put 200 called");
      deepEqual(param, {"title": "foo"}, "put 200 called");
      return id;
    };

    jio.put("bar", {"title": "foo"})
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
  // uuidStorage.remove
  /////////////////////////////////////////////////////////////////
  module("cloudoooStorage.remove");
  test("remove called substorage remove", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "cloudooo",
      url: cloudooo_url,
      sub_storage: {
        type: 'cloudooostorage200'
      }
    });
    Storage200.prototype.remove = function (param) {
      equal(param, "bar", "remove 200 called");
      return param._id;
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
  // cloudoooStorage.hasCapacity
  /////////////////////////////////////////////////////////////////

  module("cloudoooStorage.hasCapacity");
  test("hasCapacity return substorage value", function () {
    var jio = jIO.createJIO({
      type: "cloudooo",
      url: cloudooo_url,
      sub_storage: {
        type: "cloudooostorage200"
      }
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
              "Capacity 'foo' is not implemented on 'cloudooostorage200'");
        return true;
      }
    );
  });

  /////////////////////////////////////////////////////////////////
  // cloudoooStorage.buildQuery
  /////////////////////////////////////////////////////////////////
  module("cloudoooStorage.buildQuery");

  test("buildQuery return substorage buildQuery", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "cloudooo",
      url: cloudooo_url,
      sub_storage: {
        type: 'cloudooostorage200'
      }
    });

    Storage200.prototype.hasCapacity = function () {
      return true;
    };

    Storage200.prototype.buildQuery = function (options) {
      deepEqual(options, {
        include_docs: false,
        sort_on: [["title", "ascending"]],
        limit: [5],
        select_list: ["title", "id"],
        uuid: 'title: "two"'
      }, "allDocs parameter");
      return "bar";
    };

    jio.allDocs({
      include_docs: false,
      sort_on: [["title", "ascending"]],
      limit: [5],
      select_list: ["title", "id"],
      uuid: 'title: "two"'
    })
      .then(function (result) {
        deepEqual(result, {
          data: {
            rows: "bar",
            total_rows: 3
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
  // cloudoooStorage.repair
  /////////////////////////////////////////////////////////////////
  module("cloudoooStorage.repair");
  test("repair called substorage repair", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "cloudooo",
      url: cloudooo_url,
      sub_storage: {
        type: 'cloudooostorage200'
      }
    }),
      expected_options = {foo: "bar"};

    Storage200.prototype.repair = function (options) {
      deepEqual(options, expected_options, "repair 200 called");
      return "OK";
    };

    jio.repair(expected_options)
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
  // cloudoooStorage.allAttachments
  /////////////////////////////////////////////////////////////////
  module("cloudoooStorage.allAttachments");
  test("get called substorage allAttachments", function () {
    stop();
    expect(2);

    var jio = jIO.createJIO({
      type: "cloudooo",
      url: cloudooo_url,
      sub_storage: {
        type: 'cloudooostorage200'
      }
    });

    Storage200.prototype.allAttachments = function (param) {
      equal(param, "bar", "allAttachments 200 called");
      return {attachmentname: {}};
    };

    jio.allAttachments("bar")
      .then(function (result) {
        deepEqual(result, {
          attachmentname: {}
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
  // cloudoooStorage.getAttachment
  /////////////////////////////////////////////////////////////////
  module("cloudoooStorage.getAttachment");

  test("getAttachment called substorage getAttachment", function () {
    stop();
    expect(3);

    var jio = jIO.createJIO({
      type: "cloudooo",
      url: cloudooo_url,
      sub_storage: {
        type: 'cloudooostorage200'
      }
    }),
      blob = new Blob([""]);

    Storage200.prototype.getAttachment = function (id, name) {
      equal(id, "bar", "getAttachment 200 called");
      equal(name, "foo", "getAttachment 200 called");
      return blob;
    };

    jio.getAttachment("bar", "foo")
      .then(function (result) {
        deepEqual(result, blob);
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // cloudoooStorage.putAttachment
  /////////////////////////////////////////////////////////////////
  module("cloudoooStorage.putAttachment", {

    setup: function () {
      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;
      this.server.autoRespondAfter = 5;

      this.jio = jIO.createJIO({
        type: "cloudooo",
        url: cloudooo_url,
        sub_storage: {
          type: 'cloudooostorage200'
        }
      });
    },
    teardown: function () {
      this.server.restore();
      delete this.server;
    }
  });

  test("putAttachment convert from docx to docy", function () {
    stop();
    expect(8);

    var server = this.server,
      jio = this.jio,
      blob = new Blob(["document_docy_format"], {type: "docy"}),
      blob_convert = new Blob(["document_docx_format"], {type: "docx"}),
      result = serializer.serializeToString(parser.parseFromString(
        '<?xml version="1.0" encoding="UTF-8"?><methodCall>' +
          '<methodName>convertFile</methodName><params><param><value>' +
          '<string>ZG9jdW1lbnRfZG9jeF9mb3JtYXQ=</string></value></param>' +
          '<param><value><string>docx</string></value></param>' +
          '<param><value><string>docy</string></value></param>' +
	  '<param><value><boolean>0</boolean></value></param>' +
	  '<param><value><boolean>0</boolean></value></param>' +
	  '<param><struct></struct></param>' +
          '</params></methodCall>',
        'text/xml'
      ));

    this.server.respondWith("POST", cloudooo_url, [200, {
      "Content-Type": "text/xml"
    }, '<?xml version="1.0" encoding="UTF-8"?>' +
      '<string>ZG9jdW1lbnRhdWZvcm1hdGRvY3k=</string>']);

    Storage200.prototype.putAttachment = function (id, name, blob2, {}) {
      equal(id, "bar", "putAttachment 200 called");
      equal(name, "data", "putAttachment 200 called");
      deepEqual(blob2, blob, "putAttachment 200 called");
      return "OK";
    };

    Storage200.prototype.get = function (id) {
      equal(id, "bar", "get 200 called");
      return {from: "docx", to: "docy"};
    };

    return jio.putAttachment("bar", "data", blob_convert, {})
      .then(function () {
        equal(server.requests.length, 1, "Requests Length");
        equal(server.requests[0].method, "POST", "Request Method");
        equal(server.requests[0].url, cloudooo_url, "Request Url");
        deepEqual(
          server.requests[0].requestBody,
          result,
          "Request Body"
        );
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });
  test("putAttachment fail to convert", function () {
    stop();
    expect(8);
    var error = [
      "<?xml version='1.0'?>",
      "<methodResponse>",
      "<fault>",
      "<value><struct>",
      "<member>",
      "<name>faultCode</name>",
      "<value><int>1</int></value>",
      "</member>",
      "<member>",
      "<name>faultString</name>",
      "<value><string>errorFromCloudooo</string></value>",
      "</member>",
      "</struct></value>",
      "</fault>",
      "</methodResponse>"]
      .join(""),
      server = this.server,
      jio = this.jio,
      blob = new Blob(["document_docx_format"], {type: "docx"}),
      result = serializer.serializeToString(parser.parseFromString(
        '<?xml version="1.0" encoding="UTF-8"?><methodCall>' +
          '<methodName>convertFile</methodName><params><param><value>' +
          '<string>ZG9jdW1lbnRfZG9jeF9mb3JtYXQ=</string></value></param>' +
          '<param><value><string>docx</string></value></param>' +
          '<param><value><string>docy</string></value></param>' +
	  '<param><value><boolean>0</boolean></value></param>' +
	  '<param><value><boolean>0</boolean></value></param>' +
	  '<param><struct></struct></param>' +
          '</params></methodCall>',
        'text/xml'
      ));

    this.server.respondWith("POST", cloudooo_url, [200, {
      "Content-Type": "text/xml"
    }, error]);

    Storage200.prototype.get = function (id) {
      equal(id, "bar", "get 200 called");
      return {from: "docx", to: "docy"};
    };

    return jio.putAttachment("bar", "data", blob, {})
      .fail(function (error) {
        equal(server.requests.length, 1, "Requests Length");
        equal(server.requests[0].method, "POST", "Request Method");
        equal(server.requests[0].url, cloudooo_url, "Request Url");
        equal(
          server.requests[0].requestBody,
          result,
          "Request Body"
        );
        equal(error.status_code, 500, "Error status code");
        equal(error.message, 'Conversion failed', "Error message");
        equal(error.detail, 'errorFromCloudooo', "Error detail");
      })
      .always(function () {
        start();
      });

  });
/////////////////////
test("putAttachment convert from html to pdf", function () {
    stop();
    expect(8);

    var server = this.server,
      jio = this.jio,
      blob = new Blob(["document_pdf_format"], {type: "pdf"}),
      blob_convert = new Blob(["document_html_format"], {type: "html"}),
      result = serializer.serializeToString(parser.parseFromString(
        '<?xml version="1.0" encoding="UTF-8"?><methodCall>' +
          '<methodName>convertFile</methodName><params><param><value>' +
          '<string>PGh0bWw+PGhlYWQ+PC9oZWFkPgoKICA8Ym9keSBjbGFzcz0icG' +
	  'FuZS1jb250ZW50Ij48L2JvZHk+PC9odG1sPg==</string></value></param>' +
          '<param><value><string>html</string></value></param>' +
          '<param><value><string>pdf</string></value></param>' +
	  '<param><value><boolean>0</boolean></value></param>' +
	  '<param><value><boolean>0</boolean></value></param>' +
	  '<param><struct><member><name>encoding</name><value><string>utf8</string></value></member></struct></param>' +
          '</params></methodCall>',
        'text/xml'
      ));

    this.server.respondWith("POST", cloudooo_url, [200, {
      "Content-Type": "text/xml"
    }, '<?xml version='1.0'?>' +
       '<string>JVBERi0xLjQKMSAwIG9iago8PAovVGl0bGUgKP7/KQovQ3JlYXRvciAo/v8AdwBrAGgAdABtAGwA' +
       'dABvAHAAZABmACAAMAAuADEAMgAuADQpCi9Qcm9kdWNlciAo/v8AUQB0ACAANAAuADgALgA3KQov' +
       'Q3JlYXRpb25EYXRlIChEOjIwMTkwOTEwMTQwMTA4KzAyJzAwJykKPj4KZW5kb2JqCjMgMCBvYmoK' +
       'PDwKL1R5cGUgL0V4dEdTdGF0ZQovU0EgdHJ1ZQovU00gMC4wMgovY2EgMS4wCi9DQSAxLjAKL0FJ' +
       'UyBmYWxzZQovU01hc2sgL05vbmU+PgplbmRvYmoKNCAwIG9iagpbL1BhdHRlcm4gL0RldmljZVJH' +
       'Ql0KZW5kb2JqCjYgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBSCj4+CmVuZG9i' +
       'ago1IDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9QYXJlbnQgMiAwIFIKL0NvbnRlbnRzIDcgMCBSCi9S' +
       'ZXNvdXJjZXMgOSAwIFIKL0Fubm90cyAxMCAwIFIKL01lZGlhQm94IFswIDAgNTk1IDg0Ml0KPj4K' +
       'ZW5kb2JqCjkgMCBvYmoKPDwKL0NvbG9yU3BhY2UgPDwKL1BDU3AgNCAwIFIKL0NTcCAvRGV2aWNl' +
       'UkdCCi9DU3BnIC9EZXZpY2VHcmF5Cj4+Ci9FeHRHU3RhdGUgPDwKL0dTYSAzIDAgUgo+PgovUGF0' +
       'dGVybiA8PAo+PgovRm9udCA8PAo+PgovWE9iamVjdCA8PAo+Pgo+PgplbmRvYmoKMTAgMCBvYmoK' +
       'WyBdCmVuZG9iago3IDAgb2JqCjw8Ci9MZW5ndGggOCAwIFIKL0ZpbHRlciAvRmxhdGVEZWNvZGUK' +
       'Pj4Kc3RyZWFtCnicpU89C8IwEN3vV9wsmFyutknnDoKDUDI4iINEUMQWSwf/vhcSIdRNE8j7yPHy' +
       'orf+jNcZdeefGDJ2HkjZmtLCuNelwU5ljs5UmWMYYMIJeujljDjBJzVlzGEEnd6D5PhuL+yFjDtR' +
       'dzyeBC45Ig4MYI1VMd7UIh+lNLRpVNOa1olPSxmHb3BY4Sg9SDki5oork7ostFT/q+rPP/2+5CIb' +
       'e3gDFWBZbwplbmRzdHJlYW0KZW5kb2JqCjggMCBvYmoKMTY4CmVuZG9iagoyIDAgb2JqCjw8Ci9U' +
       'eXBlIC9QYWdlcwovS2lkcyAKWwo1IDAgUgpdCi9Db3VudCAxCi9Qcm9jU2V0IFsvUERGIC9UZXh0' +
       'IC9JbWFnZUIgL0ltYWdlQ10KPj4KZW5kb2JqCnhyZWYKMCAxMQowMDAwMDAwMDAwIDY1NTM1IGYg' +
       'CjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDg5OSAwMDAwMCBuIAowMDAwMDAwMTYzIDAwMDAw' +
       'IG4gCjAwMDAwMDAyNTggMDAwMDAgbiAKMDAwMDAwMDM0NCAwMDAwMCBuIAowMDAwMDAwMjk1IDAw' +
       'MDAwIG4gCjAwMDAwMDA2MzggMDAwMDAgbiAKMDAwMDAwMDg4MCAwMDAwMCBuIAowMDAwMDAwNDYz' +
       'IDAwMDAwIG4gCjAwMDAwMDA2MTggMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSAxMQovSW5mbyAx' +
       'IDAgUgovUm9vdCA2IDAgUgo+PgpzdGFydHhyZWYKOTk3CiUlRU9GCg==</string>']);

    Storage200.prototype.putAttachment = function (id, name, blob2, conversion_kw) {
      equal(id, "bar", "putAttachment 200 called");
      equal(name, "data", "putAttachment 200 called");
      deepEqual( conversion_kw, {"encoding": "utf8"} , 'parameters passed successfully');
      deepEqual(blob2, blob, "putAttachment 200 called");
      return "OK";
    };

    Storage200.prototype.get = function (id) {
      equal(id, "bar", "get 200 called");
      return {from: "html", to: "pdf"};
    };

    return jio.putAttachment("bar", "data", blob_convert, {"encoding": "utf8"})
      .then(function () {
        equal(server.requests.length, 1, "Requests Length");
        equal(server.requests[0].method, "POST", "Request Method");
        equal(server.requests[0].url, cloudooo_url, "Request Url");
        deepEqual(
          server.requests[0].requestBody,
          result,
          "Request Body"
        );
      })
      .fail(function (error) {
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });
/////////////////////
}(jIO, Blob, sinon, DOMParser, XMLSerializer));