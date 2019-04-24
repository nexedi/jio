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
/*global indexedDB, jIO, RSVP, IDBOpenDBRequest, DOMError, Event,
      parseStringToObject, Set, DOMException*/

(function (indexedDB, jIO, RSVP, IDBOpenDBRequest, DOMError,
  parseStringToObject, DOMException) {
  "use strict";

  function IndexStorage2(description) {
    if (typeof description.database !== "string" ||
        description.database === "") {
      throw new TypeError("IndexStorage2 'database' description property " +
        "must be a non-empty string");
    }
    if (description.index_keys && !(description.index_keys instanceof Array)) {
      throw new TypeError("IndexStorage2 'index_keys' description property " +
        "must be an Array");
    }
    if (description.version && (typeof description.version !== "number")) {
      throw new TypeError("IndexStorage2 'version' description property " +
        "must be a number");
    }
    this._sub_storage_description = description.sub_storage;
    this._sub_storage = jIO.createJIO(description.sub_storage);
    this._database_name = "jio:" + description.database;
    this._index_keys = description.index_keys || [];
    this._version = description.version;
    this._signature_storage_name = description.database + "_signatures";
  }

  IndexStorage2.prototype.hasCapacity = function (name) {
    return (name === "query") || (name === "limit") || (name === "list") ||
        this._sub_storage.hasCapacity(name);
  };

  function isSubset(set1, set2) {
    var i, values;
    values = Array.from(set2);
    for (i = 0; i < values.length; i += 1) {
      if (!set1.has(values[i])) {
        return false;
      }
    }
    return true;
  }

  function filterDocValues(doc, keys) {
    var filtered_doc = {}, i;
    if (keys) {
      for (i = 0; i < keys.length; i += 1) {
        filtered_doc[keys[i]] = doc[keys[i]];
      }
      return filtered_doc;
    }
    return doc;
  }

  function waitForIDBRequest(request) {
    return new RSVP.Promise(function (resolve, reject) {
      request.onerror = reject;
      request.onsuccess = resolve;
    });
  }

  function waitForAllSynchronousCursor(request, callback) {
    var force_cancellation = false;

    function canceller() {
      force_cancellation = true;
    }

    function resolver(resolve, reject) {
      request.onerror = reject;
      request.onsuccess = function (evt) {
        var cursor = evt.target.result;
        if (cursor && !force_cancellation) {
          try {
            callback(cursor);
          } catch (error) {
            reject(error);
          }
          // continue to next iteration
          cursor["continue"]();
        } else {
          resolve();
        }
      };
    }
    return new RSVP.Promise(resolver, canceller);
  }

  function getCursorResult(cursor, limit) {
    var result = [], count = 0;
    function pushLimitedMetadata(cursor) {
      if (count >= limit[0] && count < limit[1]) {
        result.push({id: cursor.primaryKey, value: {}});
      }
      count += 1;
    }
    return waitForAllSynchronousCursor(cursor, pushLimitedMetadata)
      .then(function () {
        return result;
      });
  }

  function VirtualIDB(description) {
    this._operations = description.operations;
  }

  function virtualOperation(type, context, function_arguments) {
    var cancel_callback;
    function resolver(resolve, reject) {
      cancel_callback = reject;
      context._operations.push({type: type, arguments: function_arguments,
        onsuccess: resolve, onerror: reject});
    }
    function canceller() {
      cancel_callback();
    }
    return new RSVP.Promise(resolver, canceller);
  }

  VirtualIDB.prototype.hasCapacity = function (name) {
    return (name === "list");
  };

  VirtualIDB.prototype.put = function () {
    return virtualOperation("put", this, arguments);
  };

  VirtualIDB.prototype.remove = function () {
    return virtualOperation("remove", this, arguments);
  };

  VirtualIDB.prototype.get = function () {
    return virtualOperation("get", this, arguments);
  };

  VirtualIDB.prototype.buildQuery = function () {
    return virtualOperation("buildQuery", this, arguments);
  };

  VirtualIDB.prototype.allAttachments = function () {
    return {};
  };

  jIO.addStorage("virtualidb", VirtualIDB);

  function getRepairStorage(operations, sub_storage_description,
    signature_storage_name) {
    return jIO.createJIO({
      type: "replicate",
      local_sub_storage: sub_storage_description,
      remote_sub_storage: {
        type: "virtualidb",
        operations: operations
      },
      signature_sub_storage: {
        type: "query",
        sub_storage: {
          type: "indexeddb",
          database: signature_storage_name
        }
      },
      check_remote_modification: false,
      check_remote_creation: false,
      check_remote_deletion: false,
      conflict_handling: 1,
      parallel_operation_amount: 16
    });
  }

  function handleVirtualGetSuccess(id, onsuccess, onerror) {
    return function (result) {
      if (result.target.result === undefined) {
        return onerror(new jIO.util.jIOError("Cannot find document: " +
          id, 404));
      }
      return onsuccess(result.target.result.doc);
    };
  }

  function processVirtualOperation(operation, store, index_keys, disable_get) {
    var request, get_success_handler;
    if (operation.type === "put") {
      request = store.put({
        id: operation.arguments[0],
        doc: filterDocValues(operation.arguments[1], index_keys),
      });
      request.onerror = operation.onerror;
      return {request: request, onsuccess: operation.onsuccess};
    }
    if (operation.type === "get") {
      // if storage was cleared, get can return without checking the database
      if (disable_get) {
        operation.onerror(new jIO.util.jIOError("Cannot find document: " +
          operation.arguments[0], 404));
      } else {
        get_success_handler = handleVirtualGetSuccess(operation.arguments[0],
            operation.onsuccess, operation.onerror);
        request = store.get(operation.arguments[0]);
        request.onerror = operation.onerror;
        return {request: request, onsuccess: get_success_handler};
      }
    }
    if (operation.type === "buildQuery") {
      request = store.getAllKeys();
      request.oerror = operation.onerror;
      return {request: request, onsuccess: operation.onsuccess};
    }
    if (operation.type === "remove") {
      request = store.delete(operation.arguments[0]);
      request.onerror = operation.onerror;
      return {request: request, onsuccess: operation.onsuccess};
    }
  }

  var transaction_failure_reason;

  function repairInTransaction(sub_storage_description, transaction,
    index_keys, signature_storage_name, clear_storage) {
    var repair_promise, repeatUntilPromiseFulfilled, store,
      operations = [];
    if (clear_storage) {
      indexedDB.deleteDatabase("jio:" + signature_storage_name);
    }
    store = transaction.objectStore("index-store");
    repair_promise = getRepairStorage(operations,
      sub_storage_description, signature_storage_name).repair();
    repeatUntilPromiseFulfilled = function repeatUntilPromiseFulfilled(
      continuation_request,
      continuation_resolve
    ) {
      var operation_result, next_continuation_request,
        next_continuation_resolve;
      continuation_request.onsuccess = function () {
        if (continuation_resolve) {
          continuation_resolve.apply(null, arguments);
        }
        while (operations.length !== 0) {
          operation_result = processVirtualOperation(operations.shift(), store,
            index_keys, clear_storage);
          // use the current request to continue the repeat loop if possible
          if (next_continuation_request && operation_result) {
            operation_result.request.onsuccess = operation_result.onsuccess;
          } else if (operation_result) {
            next_continuation_request = operation_result.request;
            next_continuation_resolve = operation_result.onsuccess;
          }
        }
        if (repair_promise.isRejected) {
          transaction.abort();
          transaction_failure_reason = repair_promise.rejectedReason;
          return;
        }
        if (repair_promise.isFulfilled) {
          return;
        }
        return repeatUntilPromiseFulfilled(next_continuation_request ||
          store.get("inexistent"), next_continuation_resolve);
      };
    };
    repeatUntilPromiseFulfilled(store.get("inexistent"));
  }

  function handleUpgradeNeeded(evt, index_keys, sub_storage_description,
    signature_storage_name) {
    var db = evt.target.result, store, i, current_indices, required_indices;
    required_indices = new Set(index_keys.map(function (name) {
      return "Index-" + name;
    }));
    if (db.objectStoreNames[0] === "index-store") {
      store = evt.target.transaction.objectStore("index-store");
    }

    current_indices = new Set(store ? store.indexNames : []);
    if (isSubset(current_indices, required_indices)) {
      if (store) {
        for (i = 0; i < store.indexNames.length; i += 1) {
          if (!required_indices.has(store.indexNames[i])) {
            store.deleteIndex(store.indexNames[i]);
          }
        }
      }
    } else {
      if (store) {
        db.deleteObjectStore("index-store");
        current_indices.clear();
      }
      store = db.createObjectStore("index-store", {
        keyPath: "id",
        autoIncrement: false
      });
      for (i = 0; i < index_keys.length; i += 1) {
        store.createIndex("Index-" + index_keys[i],
          "doc." + index_keys[i], { unique: false });
      }
      return repairInTransaction(sub_storage_description,
        evt.target.transaction, index_keys, signature_storage_name, true);
    }
  }

  function waitForOpenIndexedDB(db_name, version, index_keys,
    sub_storage_description, signature_storage_name, callback) {
    function resolver(resolve, reject) {
      // Open DB //
      var request = indexedDB.open(db_name, version);
      request.onerror = function (error) {
        var error_sub_message;
        if (request.result) {
          request.result.close();
        }
        if ((error !== undefined) &&
            (error.target instanceof IDBOpenDBRequest) &&
            ((error.target.error instanceof DOMError) ||
             (error.target.error instanceof DOMException))) {
          error_sub_message = error.target.error.message;
          if (transaction_failure_reason) {
            error_sub_message += " " + transaction_failure_reason;
            transaction_failure_reason = undefined;
          }
          reject("Connection to: " + db_name + " failed: " + error_sub_message);
        } else {
          reject(error);
        }
      };

      request.onabort = function () {
        request.result.close();
        reject("Aborting connection to: " + db_name);
      };

      request.ontimeout = function () {
        request.result.close();
        reject("Connection to: " + db_name + " timeout");
      };

      request.onblocked = function () {
        request.result.close();
        reject("Connection to: " + db_name + " was blocked");
      };

      // Create DB if necessary //
      request.onupgradeneeded = function (evt) {
        handleUpgradeNeeded(evt, index_keys, sub_storage_description,
          signature_storage_name);
      };

      request.onversionchange = function () {
        request.result.close();
        reject(db_name + " was upgraded");
      };

      request.onsuccess = function () {
        return new RSVP.Queue()
          .push(function () {
            return callback(request.result);
          })
          .push(function (result) {
            request.result.close();
            resolve(result);
          }, function (error) {
            request.result.close();
            reject(error);
          });
      };
    }

    return new RSVP.Promise(resolver);
  }

  function waitForTransaction(db, stores, flag, callback) {
    var tx = db.transaction(stores, flag);
    function canceller() {
      try {
        tx.abort();
      } catch (unused) {
        // Transaction already finished
        return;
      }
    }
    function resolver(resolve, reject) {
      var result;
      try {
        result = callback(tx);
      } catch (error) {
        reject(error);
      }
      tx.oncomplete = function () {
        return new RSVP.Queue()
          .push(function () {
            return result;
          })
          .push(resolve, function (error) {
            canceller();
            reject(error);
          });
      };
      tx.onerror = function (error) {
        canceller();
        reject(error);
      };
      tx.onabort = function (evt) {
        reject(evt.target);
      };
      return tx;
    }
    return new RSVP.Promise(resolver, canceller);
  }

  IndexStorage2.prototype._runQuery = function (key, value, limit) {
    var context = this;

    return RSVP.Queue()
      .push(function () {
        return waitForOpenIndexedDB(context._database_name, context._version,
          context._index_keys, context._sub_storage_description,
          context._signature_storage_name, function (db) {
            return waitForTransaction(db, ["index-store"], "readonly",
              function (tx) {
                if (limit) {
                  return getCursorResult(tx.objectStore("index-store")
                    .index("Index-" + key).openCursor(value), limit);
                }
                return waitForIDBRequest(tx.objectStore("index-store")
                  .index("Index-" + key).getAllKeys(value));
              });
          });
      })
      .push(function (result) {
        if (limit) {
          return result;
        }
        return result.target.result.map(function (item) {
          return {id: item, value: {}};
        });
      });
  };

  IndexStorage2.prototype.buildQuery = function (options) {
    var context = this, query;
    if (options.query && !options.include_docs && !options.sort_on &&
        !options.select_list) {
      query = parseStringToObject(options.query);
      if (query.type === "simple") {
        if (context._index_keys.indexOf(query.key) !== -1) {
          return context._runQuery(query.key, query.value, options.limit)
            .then(function (result) {
              return result;
            });
        }
      }
    }
    return context._sub_storage.allDocs(options)
      .push(function (result) {
        return result.data.rows;
      });
  };

  IndexStorage2.prototype.get = function () {
    return this._sub_storage.get.apply(this._sub_storage, arguments);
  };

  IndexStorage2.prototype._put = function (id, value) {
    var context = this;
    if (context._index_keys.length === 0) {
      return;
    }
    return waitForOpenIndexedDB(context._database_name, context._version,
      context._index_keys, context._sub_storage_description,
      context._signature_storage_name, function (db) {
        return waitForTransaction(db, ["index-store"], "readwrite",
          function (tx) {
            return waitForIDBRequest(tx.objectStore("index-store").put({
              "id": id,
              "doc": filterDocValues(value, context._index_keys)
            }));
          });
      });
  };

  IndexStorage2.prototype.put = function (id, value) {
    var context = this;
    return context._sub_storage.put(id, value)
      .push(function () {
        return context._put(id, value);
      });
  };

  IndexStorage2.prototype.post = function (value) {
    var context = this;
    return context._sub_storage.post(value)
      .push(function (id) {
        return context._put(id, value)
          .then(function () {
            return id;
          });
      });
  };

  IndexStorage2.prototype.remove = function (id) {
    var context = this;
    return context._sub_storage.remove(id)
      .push(function () {
        return waitForOpenIndexedDB(context._database_name, context._version,
          context._index_keys, context._sub_storage_description,
          context._signature_storage_name, function (db) {
            return waitForTransaction(db, ["index-store"], "readwrite",
              function (tx) {
                return waitForIDBRequest(tx.objectStore("index-store")
                  .delete(id));
              });
          });
      });
  };

  IndexStorage2.prototype.repair = function () {
    var context = this;
    return waitForOpenIndexedDB(context._database_name, context._version,
      context._index_keys, context._sub_storage_description,
      context._signature_storage_name, function (db) {
        return waitForTransaction(db, ["index-store"], "readwrite",
          function (tx) {
            return repairInTransaction(context._sub_storage_description, tx,
              context._index_keys, context._signature_storage_name);
          });
      });
  };

  IndexStorage2.prototype.getAttachment = function () {
    return this._sub_storage.getAttachment.apply(this._sub_storage, arguments);
  };

  IndexStorage2.prototype.putAttachment = function () {
    return this._sub_storage.putAttachment.apply(this._sub_storage, arguments);
  };

  IndexStorage2.prototype.removeAttachment = function () {
    return this._sub_storage.removeAttachment.apply(this._sub_storage,
      arguments);
  };

  jIO.addStorage("index2", IndexStorage2);
}(indexedDB, jIO, RSVP, IDBOpenDBRequest, DOMError, parseStringToObject,
  DOMException));