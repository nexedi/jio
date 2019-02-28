/*
 * Copyright 2019, Nexedi SA
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
/*jslint nomen: true */
/*global indexedDB*/
(function (jIO, QUnit) {
  "use strict";
  var test = QUnit.test,
    stop = QUnit.stop,
    start = QUnit.start,
    ok = QUnit.ok,
    expect = QUnit.expect,
    deepEqual = QUnit.deepEqual,
    equal = QUnit.equal,
    module = QUnit.module;

  function deleteIndexedDB(storage) {
    return new RSVP.Promise(function resolver(resolve, reject) {
      var request = indexedDB.deleteDatabase(
        storage.__storage._database_name
      );
      request.onerror = reject;
      request.onblocked = reject;
      request.onsuccess = resolve;
    });
  }

  /////////////////////////////////////////////////////////////////
  // Custom test substorage definition
  /////////////////////////////////////////////////////////////////
  function DummyStorage3() {
    return this;
  }
  jIO.addStorage('dummystorage3', DummyStorage3);

  /////////////////////////////////////////////////////////////////
  // indexStorage2.constructor
  /////////////////////////////////////////////////////////////////
  module("indexStorage2.constructor");
  test("Constructor with empty index_keys", function () {
    var jio = jIO.createJIO({
      type: "index2",
      database: "index2_test",
      index_keys: [],
      sub_storage: {
        type: "dummystorage3"
      }
    });

    equal(jio.__type, "index2");
    equal(jio.__storage._sub_storage.__type, "dummystorage3");
    equal(jio.__storage._database_name, "jio:index2_test");
  });

  /////////////////////////////////////////////////////////////////
  // indexStorage2.hasCapacity
  /////////////////////////////////////////////////////////////////
  module("indexStorage2.hasCapacity");
  test("can list documents", function () {
    var jio = jIO.createJIO({
      type: "index2",
      database: "index2_test",
      index_keys: [],
      sub_storage: {
        type: "dummystorage3"
      }
    });

    ok(jio.hasCapacity("list"));
    ok(jio.hasCapacity("query"));
  });

  /////////////////////////////////////////////////////////////////
  // indexStorage2.get
  /////////////////////////////////////////////////////////////////
  module("indexStorage2.get", {
    setup: function () {
      this.jio = jIO.createJIO({
        type: "index2",
        database: "index2_test",
        index_keys: [],
        sub_storage: {
          type: "dummystorage3"
        }
      });
    }
  });
  test("Simple put get", function () {
    var context = this;
    stop();
    expect(4);

    DummyStorage3.prototype.put = function (id, value) {
      equal(id, "32");
      deepEqual(value, {"a": 3, "b": 2, "c": 8});
      return id;
    };

    DummyStorage3.prototype.get = function (id) {
      equal(id, "32");
      return {"a": 3, "b": 2, "c": 8};
    };

    context.jio.put("32", {"a": 3, "b": 2, "c": 8})
      .then(function () {
        return context.jio.get("32");
      })
      .then(function (result) {
        deepEqual(result, {"a": 3, "b": 2, "c": 8});
      })
      .fail(function (error) {
        console.log(error);
      })
      .then(function () {
        return deleteIndexedDB(context.jio);
      })
      .always(function () {
        start();
      });
  });

  /////////////////////////////////////////////////////////////////
  // indexStorage2.buildQuery
  /////////////////////////////////////////////////////////////////
  module("indexStorage2.buildQuery");

  test("Simple query", function () {
    var jio = jIO.createJIO({
        type: "index2",
        database: "index2_test",
        index_keys: ["a", "b"],
        sub_storage: {
          type: "dummystorage3"
        }
      });
    stop();
    expect(3);

    DummyStorage3.prototype.put = function (id, value) {
      equal(id, "32");
      deepEqual(value, {a: "3", b: "2"});
      return id;
    };

    jio.put("32", {"a": "3", "b": "2"})
      .then(function () {
        return jio.allDocs({query: 'a: "3"'});
      })
      .then(function (result) {
        deepEqual(result.data.rows[0], {"id": "32", "value": {}});
      })
      .fail(function (error) {
        console.log(error);
      })
      .then(function () {
        return deleteIndexedDB(jio);
      })
      .always(function () {
        start();
      });
  });

  test("No index keys provided", function () {
    var jio = jIO.createJIO({
        type: "index2",
        database: "index2_test",
        index_keys: [],
        sub_storage: {
          type: "dummystorage3"
        }
      });
    stop();
    expect(4);

    DummyStorage3.prototype.put = function (id, value) {
      equal(id, "32");
      deepEqual(value, {"a": "3", "b": "2"});
      return id;
    };
    DummyStorage3.prototype.buildQuery = function (options) {
      equal(options.query, 'a:3');
    };
    DummyStorage3.prototype.hasCapacity = function (capacity) {
      equal(capacity, "query");
      return false;
    };

    jio.put("32", {"a": "3", "b": "2"})
      .then(function () {
        return jio.allDocs({query: 'a:"3"'});
      })
      .fail(function (error) {
        equal(error.message,
          "Capacity 'query' is not implemented on 'dummystorage3'");
      })
      .then(function () {
        return deleteIndexedDB(jio);
      })
      .always(function () {
        start();
      });
  });

  test("No Query", function () {
    var jio = jIO.createJIO({
        type: "index2",
        database: "index2_test",
        index_keys: ["a"],
        sub_storage: {
          type: "dummystorage3"
        }
      });
    stop();
    expect(1);

    DummyStorage3.prototype.put = function (id) {
      return id;
    };

    RSVP.all([
      jio.put("32", {"a": "3", "b": "2"}),
      jio.put("21", {"a": "6", "b": "9"}),
      jio.put("3", {"a": "8", "b": "5"})
    ])
      .then(function () {
        return jio.allDocs();
      })
      .then(function (result) {
        equal(result.data.total_rows, 3);
      })
      .fail(function (error) {
        console.log(error);
      })
      .then(function () {
        return deleteIndexedDB(jio);
      })
      .always(function () {
        start();
      });
  });

  test("Complex queries", function () {
    var jio = jIO.createJIO({
      type: "index2",
      database: "index2_test",
      index_keys: ["name", "user"],
      sub_storage: {
        type: "dummystorage3"
      }
    });
    stop();
    expect(12);

    DummyStorage3.prototype.put = function (id) {
      return id;
    };

    function id_compare(value1, value2) {
      if (value1.id > value2.id) {
        return 1;
      }
      if (value1.id < value2.id) {
        return -1;
      }
      return 0;
    }

    RSVP.all([
      jio.put("1", {"name": "envision", "url": "jio.nexedi.com",
        "user": "Mann"}),
      jio.put("23", {"name": "obscure", "url": "jio.nexedi.com",
        "user": "Hesse"}),
      jio.put("5", {"name": "envelope", "url": "renderjs.nexedi.com",
        "user": "Mann"}),
      jio.put("34", {"name": "censure", "url": "nexedi.com", "user": "Brahms"}),
      jio.put("38", {"name": "observe", "url": "erp5.com", "user": "Hesse"}),
      jio.put("76", {"name": "linear", "url": "vifib.com", "user": "J Evol"}),
      jio.put("14", {"name": "obscure", "url": "re6st.nexedi.com",
        "user": "Lietz"}),
      jio.put("19", {"name": "razor", "url": "erp5.com", "user": "Karajan"}),
      jio.put("59", {"name": "envision", "url": "nexedi.com",
        "user": "Handel"}),
      jio.put("31", {"name": "obtuse", "url": "officejs.com",
        "user": "Johann"}),
      jio.put("45", {"name": "repeat", "url": "slapos.com", "user": "Specter"}),
      jio.put("48", {"name": "sever", "url": "neo.nexedi.com",
        "user": "Rienzi"}),
      jio.put("72", {"name": "organisers", "url": "vifib.net",
        "user": "Parzival"})
    ])
      .then(function () {
        return jio.allDocs({"query": "name:razor"});
      })
      .then(function (result) {
        equal(result.data.total_rows, 1);
        deepEqual(result.data.rows, [{"id": "19", "value": {}}]);
      })
      .then(function () {
        return jio.allDocs({"query": "name:obscure"});
      })
      .then(function (result) {
        equal(result.data.total_rows, 2);
        deepEqual(result.data.rows.sort(), [{"id": "23", "value": {}},
          {"id": "14", "value": {}}].sort(id_compare));
      })
      .then(function () {
        return jio.allDocs({"query": "name:envision AND user:Mann"});
      })
      .then(function (result) {
        equal(result.data.total_rows, 1);
        deepEqual(result.data.rows, [{"id": "1", "value": {}}]);
      })
      .then(function () {
        return jio.allDocs({"query": "name:repeat OR user:Hesse"});
      })
      .then(function (result) {
        equal(result.data.total_rows, 3);
        deepEqual(result.data.rows.sort(id_compare),
          [{"id": "23", "value": {}}, {"id": "38", "value": {}},
            {"id": "45", "value": {}}].sort(id_compare));
      })
      .then(function () {
        return jio.allDocs(
          {"query": "(user:Mann OR user:Hesse) AND name:envelope"}
        );
      })
      .then(function (result) {
        equal(result.data.total_rows, 1);
        deepEqual(result.data.rows, [{"id": "5", "value": {}}]);
      })
      .then(function () {
        return jio.allDocs({"query": "url:slapos.com"});
      })
      .then(function (result) {
        equal(result.data.total_rows, 1);
        deepEqual(result.data.rows, ["45"]);
      })
      .then(function () {
        return jio.allDocs({});
      })
      .then(function (result) {
        equal(result.data.total_rows, 13);
        deepEqual(result.data.rows.sort(), ["1", "23", "5", "34", "38",
          "76", "14", "19", "59", "31", "45", "48", "72"].sort());
      })
      .fail(function (error) {
        console.error(error);
        ok(false, error);
      })
      .always(function () {
        start();
      });
  });

}(jIO, QUnit));