"use strict";

function namespace(func, object) {
  const ns = Object.create(null);

  let export_ = function(objects) {
    for (let name in objects)
      ns[name] = objects[name];
  };

  Object.defineProperty(ns, "export", {
    value: export_,
    enumerable: false,
    configurable: false,
    writable: false
  });
  
  if (typeof object == "function") {
    object.prototype = ns;
    let instance = new object();
    return func(instance) || instance;
  } else if (typeof object == "object") {
    object.export = function(objects) {
      for (let name in objects)
        object[name] = objects[name];
    };
    return func(object) || object; 
  }
  return func(ns) || ns;
}


  let buffer = new ArrayBuffer(102400);
  let byteOffset = 8;

  const uint8array = new Uint8Array(buffer);
  const int8array = new Int8Array(buffer);

  const uint16array = new Uint16Array(buffer);
  const int16array = new Int16Array(buffer);

  const uint32array = new Uint32Array(buffer);
  const int32array = new Int32Array(buffer);

  const float32array = new Float32Array(buffer);
  const float64array = new Float64Array(buffer);

  const biguint64array = new BigUint64Array(buffer);
  const bigint64array = new BigInt64Array(buffer);

  function u8(offset, value) {
    if (value == undefined)
      return uint8array[offset];
    return uint8array[offset] = value;
  }

  function i8(offset, value) {
    if (value == undefined)
      return int8array[offset];
    return int8array[offset] = value;
  }

  function u16(offset, value) {
    if (value == undefined)
      return uint16array[offset >> 1];
    return uint16array[offset >> 1] = value;
  }

  function i16(offset, value) {
    if (value == undefined)
      return int16array[offset >> 1];
    return int16array[offset >> 1] = value;
  }

  function u32(offset, value) {
    if (value == undefined)
      return uint32array[offset >> 2];
    return uint32array[offset >> 2] = value;
  }

  function i32(offset, value) {
    if (value == undefined)
      return int32array[offset >> 2];
    return int32array[offset >> 2] = value;
  }

  function f32(offset, value) {
    if (value == undefined)
      return float32array[offset >> 2];
    return float32array[offset >> 2] = value;
  }

  function f64(offset, value) {
    if (value == undefined)
      return float64array[offset >> 3];
    return float64array[offset >> 3] = value;
  }

  function bi64(offset, value) {
    if (value == undefined)
      return bigint64array[offset >> 3];
    return bigint64array[offset >> 3] = value;
  }

  function bu64(offset, value) {
    if (value == undefined)
      return biguint64array[offset >> 3];
    return biguint64array[offset >> 3] = value;
  }

  function roundup(num, r) {
    return (num + r - 1) & -r;
  }

  function defineConst(object, name, value) {
    Object.defineProperty(object, name, {
      value,
      enumerable: true,
      configurable: false,
      writable: false,
    });
  }

  function defineNonEnum(object, name, value) {
    Object.defineProperty(object, name, {
      value,
      enumerable: false,
      configurable: false,
      writable: false,
    });
  }

  const sOffset = Symbol("offset");
  const sLength = Symbol("length");

  const sId = Symbol("id");
  let funcId = 1;

  const allocSizeMap = new Map();
  
  const alloc = (byteLength) => {
    let offset = byteOffset;
    let size = roundup(byteLength, 4);
    byteOffset += size;
    allocSizeMap.set(offset, size);
    return offset;
  };
  
  const free = (offset) => {
    
  };

  const copyBytes = (src, dest, size) => {
    new Int8Array(buffer, dest, size).set(new Int8Array(buffer, src, size));
  };
  
  const sizeOf = (obj) => {
    return obj[sLength];
  };

  function voidptr(offset) {
    return new PointRef(Void, offset);
  }

  function isPrimitiveValue(value) {
    return typeof value == "string" ||
      typeof value == "number" || typeof value == "boolean";
  }

  function Void(offset) {
    defineNonEnum(this, sOffset, +offset);
    defineNonEnum(this, sLength, 0);
  }
  
  Void.prototype.valueOf = function() {
    return null;
  };

  defineNonEnum(Void, sLength, 0);
  defineNonEnum(Void, sId, funcId++);

  function Uint8(offset, value) {
    defineNonEnum(this, sOffset, +offset);
    if (value != undefined)
      u8(this[sOffset], value);
  }

  Uint8.prototype.valueOf = function() {
    return u8(this[sOffset]);
  };

  defineNonEnum(Uint8, sLength, 1);
  defineNonEnum(Uint8, sId, funcId++);

  function Int32(offset, value) {
    defineNonEnum(this, sOffset, +offset);
    if (value != undefined)
      i32(this[sOffset], value);
  }

  Int32.prototype.valueOf = function() {
    return i32(this[sOffset]);
  };

  defineNonEnum(Int32, sLength, 4);
  defineNonEnum(Int32, sId, funcId++);

  function Bool(offset, value) {
    defineNonEnum(this, sOffset, +offset);
    defineNonEnum(this, sLength, 1);

    if (value != undefined)
      u8(this[sOffset], value || value > 0 ? 1 : 0);
  }

  Bool.prototype.valueOf = function() {
    return u8(this[sOffset]) == 1 ? true : false;
  };

  defineNonEnum(Bool, sLength, 1);
  defineNonEnum(Bool, sId, funcId++);

  function Float32(offset, value) {
    defineNonEnum(this, sOffset, +offset);
    defineNonEnum(this, sLength, 4);

    if (value != undefined)
      f32(this[sOffset], value);
  }

  Float32.prototype.valueOf = function() {
    return f32(this[sOffset]);
  };

  defineNonEnum(Float32, sLength, 4);
  defineNonEnum(Float32, sId, funcId++);

  function Char(offset, value) {
    defineNonEnum(this, sOffset, +offset);
    defineNonEnum(this, sLength, 1);
    if (value != undefined)
      u8(this[sOffset], typeof value == "string"
        ? value.charCodeAt(0) : value);
  }

  Char.prototype.toString = function() {
    return String.fromCharCode(this.valueOf());
  };

  Char.prototype.valueOf = function() {
    return u8(this[sOffset]);
  };

  defineNonEnum(Char, sLength, 1);
  defineNonEnum(Char, sId, funcId++);

  function StringUtf8(offset, value) {
    defineNonEnum(this, sOffset, +offset);
    defineNonEnum(this, sLength, 4);

    if (value == undefined) return;
    let str_len = value.length;
    let str_offset = alloc(roundup(str_len + 4, 4));
    u32(str_offset, str_len);
    u32(this[sOffset], str_offset);

    for (let index = 0; index < str_len; index++) {
      u8(str_offset + 4 + index, value.charCodeAt(index));
    }
  }

  StringUtf8.prototype.toString = function() {
    let str_offset = u32(this[sOffset]);
    let str_len = u32(str_offset);
    let str_arr = [];

    for (let index = 0; index < str_len; index++) {
      str_arr.push(String.fromCharCode(u8(str_offset + 4 + index)));
    }
    return str_arr.join("");
  };

  defineNonEnum(StringUtf8, sLength, 4);
  defineNonEnum(StringUtf8, sId, funcId++);
  
  function PointRef(func, offset, deep = 1, isPrimitiveType = false) {
    defineNonEnum(this, sOffset, offset);
    defineNonEnum(this, sLength, 4);
    //this.offset = offset;
    //this.length = 4;
    this.deref = function(value) {
      if (value != undefined) {
        if (deep > 0)
          u32(offset, value[sOffset]);
        // implement for primitive types
        return value;
      }

      let ptr = u32(offset);
      if (ptr == 0)
        throw new Error("Unable to dereference a null pointer.");
      if ((deep - 1) == 0)
        return new func(voidptr(ptr));
      else
        return new PointRef(func, ptr, deep - 1);
    };

    this.at = function(index) {
      let ptr = u32(offset);
      if (ptr == 0)
        throw new Error("Unable to dereference a null pointer.");
      if (deep == 1)
        return new func(voidptr(ptr + (index * func[sLength])));
      else
        return new PointRef(func, ptr + (index * func[sLength]), deep - 1);
    };

    this.put = function(index, value) {
      let ptr = u32(offset);
      if (ptr == 0)
        throw new Error("Unable to assign value to a null pointer.");
      if (deep == 1) {
        if (isPrimitiveType && isPrimitiveValue(value))
          func.call({}, ptr + (index * func[sLength]), value);
        else
          copyBytes(value[sOffset], ptr + (index * func[sLength]), func[sLength]);
      } else {
        u32(ptr + (index * func[sLength]), value[sOffset]);
      }
      return value;
    };

    this.isNullptr = function() {
      return u32(offset) == 0;
    };
  }

  PointRef.prototype.valueOf = function() {
    return this[sOffset];
  };

  let nullptr = voidptr(0);
  
  function ArrayRef(type, offset, length) {
    //this.offset = offset;
    defineNonEnum(this, sOffset, offset);
    defineNonEnum(this, sLength, type.size * length);
    defineNonEnum(this, "length", length);
    this.at = function(index) {
      if (index >= length)
        throw new Error("Out of bounds array index: " + index);
      return type.init(offset + (index * type.size));
    };
    
    this.put = function(index, value) {
      if (index >= length)
        throw new Error("Out of bounds array index: " + index);
      return type.set(offset + (index * type.size), value);
    };
  }

  function Type(func, ptr) {
    let size = ptr > 0 ? 4 : func[sLength];
    let isPrimitiveType = func[sId] >= 1 && func[sId] <= 10;
    
    this.init = function(offset) {
      if (offset == undefined)
        offset = alloc(size);
      if (ptr > 0) {
        return new PointRef(func, offset, ptr, isPrimitiveType);
      }
      return new func(voidptr(offset));
    };
    
    Object.defineProperty(this, "size", {
      get() { return size; },
      enumerable: true,
      configurable: false
    });

    this.set = function(offset, value) {
      if (ptr > 0) {
        u32(offset, value[sOffset]);
        return value;
      }
      if (isPrimitiveType)
        return new func(voidptr(offset), value);
      
      new Uint8Array(buffer, offset, func[sLength]).set(new Uint8Array(buffer, value[sOffset], func[sLength]));
      return new func(voidptr(offset));
    };
    
    this.array = function(length) {
      return new TypeArray(this, length);
    };
    
    this.bitfield = function(bits) {
      
    };
  }
  
  function TypeArray(type, length) {
    this.length = length;
    this.size = length * type.size;
    this.init = function(offset) {
      return new ArrayRef(type, offset, length);
    };

    this.set = function(offset, value) {
      
    };
  }

  function type(func, ptr = "") {
    return new Type(func, ptr.length);
  }

  function typeCheck() {

  }

  function getGetterSetter(type, offset) {
    return {
      get() {
        return type.init(this[sOffset] + offset);
      },
      set(value) {
        return type.set(this[sOffset] + offset, value);
      }
    };
  }
  
  function getStaticGetterSetter(type, offset) {
    return {
      get() { return type.init(offset); },
      set(value) { return type.set(offset, value); }
    };
  }
  
  const $ = { type , __proto__: null };
  $.bool = type(Bool);
  $.u8 = type(Uint8);
  $.u8ptr = type(Uint8, "*");
  $.int = type(Int32);
  $.i32 = $.int;
  $.i32ptr = $.type(Int32, "*"),
  $.float = type(Float32);
  $.string = type(String);
  $.char = type(Char);
  $.voidptr = type(Void, "*");
  $.nullptr = nullptr;
  
  $.ptr = function(func) {
    return type(func, "*");
  };
  
  $.ptrptr = function(func) {
    return type(func, "**");
  };
  
  function defineInstanceProp(obj, offset, length) {
    defineNonEnum(obj, sOffset, offset);
    defineNonEnum(obj, sLength, length);
  }
  
  $[0] = function(object, pointer, args) {
    let constructor = object[object.constructor.name] || function() { };
    let size = object.constructor[sLength];
    
    if (pointer == undefined) {
      pointer = voidptr(alloc(size));
      args = [];
    }
    
    if (pointer instanceof PointRef) {
      defineInstanceProp(object, pointer[sOffset], size);
      if (Array.isArray(args)) {
        constructor.apply(object, args);
      }
      return;
    }

    if (Array.isArray(pointer)) {
      args = pointer;
      pointer = alloc(size);
      defineInstanceProp(object, pointer, size);
      constructor.apply(object, args);
      return;
    }
    throw new Error("Invalid arguments.");
  };

  $[1] = function(obj, prop, isUnion = false) {
    let offset = 0;
    let size = 0;
    let sizes = [8,4,2];
    for (let name in prop) {
      let type = prop[name];
      typeCheck(type);
      
      for (let index = 0; index < 3; index++) {
        let modulo = sizes[index];
        if (type.size % modulo == 0 && offset % modulo != 0 && type.size == modulo) {
          offset = roundup(offset, modulo);
          break;
        }
      }

      let getset = getGetterSetter(type, offset);
      Object.defineProperty(obj, name, {
        get: getset.get,
        set: getset.set,
        enumerable: true,
        configurable: false
      });
      
      !isUnion ? offset += type.size: size = Math.max(offset, size);
    }

    defineNonEnum(obj.constructor, sLength, !isUnion ? roundup(offset, 4) : roundup(size, 4));
    defineNonEnum(obj.constructor, sId, funcId++);
  };

  $.struct = $[1];
  const struct = $.struct;
  
  $[2] = function(obj, prop, isUnion = false) {
    let sizes = [8,4,2];
    for (let name in prop) {
      let type = prop[name];
      typeCheck(type);

      let offset = alloc(type.size);
      
      for (let index = 0; index < 3; index++) {
        let modulo = sizes[index];
        if (type.size % modulo == 0 && offset % modulo != 0 && type.size == modulo) {
          offset = roundup(offset, modulo);
          break;
        }
      }
      
      let getset = getStaticGetterSetter(type, offset);
      Object.defineProperty(obj, name, {
        get: getset.get,
        set: getset.set,
        enumerable: true,
        configurable: false
      });
    }
  };

  $.embed = $[2];


const v8 = namespace((v8) => {
  const _ = "prototype";
  const internal = namespace((internal) => {
    const KB = 1024;
    const MB = KB * KB;
    const kMaxInt = 0x7FFFFFFF;
  
    const kIntSize = 4;
    // int size in 32 bit machine
    const kPointerSize = 4;
    // pointer size in 32 bit machine
  
    const kHeapObjectTag = 1;
  
    const kBitsPerByte = 8;
    const kBitsPerPointer = kPointerSize * kBitsPerByte;
  
    const Max = (a, b) => a < b ? b : a;
    const Min = (a, b) => a < b ? a : b;
  
    const OffsetFrom = (x) => x - 0;
    const AddressFrom = (x) => (0 + x);
  
    const RoundDown = (x, m) => AddressFrom(OffsetFrom(x) & -m);
    const RoundUp = (x, m) => RoundDown(x + m - 1, m);
  
    const RoundUpToPowerOf2 = (x) => {
      x = x - 1;
      x = x | (x >> 1);
      x = x | (x >> 2);
      x = x | (x >> 4);
      x = x | (x >> 8);
      x = x | (x >> 16);
      return x + 1;
    }

    function FlagValue() {
      $[0](this, ...arguments);
    }
    
    FlagValue.New_BOOL = function(b) {
      let v = new FlagValue();
      v.b = b;
      return v;
    };
    
    FlagValue.New_INT = function() {
      let v = new FlagValue();
      v.i = i;
      return v;
    }
    
    FlagValue.New_FLOAT = function() {
      let v = new FlagValue();
      v.f = f;
      return v;
    }
    
    FlagValue.New_STRING = function() {
      let v = new FlagValue();
      v.s = s;
      return v;
    }
    
    struct(FlagValue[_], {
      b: $.bool,
      i: $.i32,
      f: $.float,
      s: $.string
    });
    

    function Flag() {
      $[0](this, ...arguments);
    }
    
    Flag.Type = {
      BOOL: 1, INT: 2, FLOAT: 3, STRING: 4,
      __proto__: null
    };

    Flag[_].Flag = function() {
      console.log(...arguments);
    }

    Flag[_].file = function() {
      return this.file_;
    }
    
    Flag[_].name = function() {
      return this.name_;
    }
    
    Flag[_].comment = function() {
      return this.comment_;
    }
    
    Flag[_].type = function() {
      return this.type_;
    }
    
    Flag[_].bool_variable = function(value) {
      if (value == undefined)
        return this.variable_.b; 
      return this.variable_.b = value;
    }
    
    Flag[_].int_variable = function(value) {
      if (value == undefined)
        return this.variable_.i; 
      return this.variable_.i = value;
    }
    
    Flag[_].float_variable = function(value) {
      if (value == undefined)
        return this.variable_.f; 
      return this.variable_.f = value;
    }
    
    Flag[_].string_variable = function(value) {
      if (value == undefined)
        return this.variable_.s; 
      return this.variable_.s = value;
    }

    struct(Flag[_], {
      file_: $.string,
      name_: $.string,
      comment_: $.string,
      
      type_: $.i32,
      variable_: $.type(FlagValue, "*"),
      default_: $.type(FlagValue),
      
      next_: $.type(Flag, "*") // Flag pointer
    });

    const Type2String = (type) => {
      switch (type) {
        case Flag.Type.BOOL: return "bool";
        case Flag.Type.INT: return "int";
        case Flag.Type.FLOAT: return "float";
        case Flag.Type.STRING: return "string";
      }
      return null;
    };

    function FlagList() {
      $[0](this, ...arguments);
    }
    
    FlagList.Lookup = function(name) {
      let f = this.list_();
      while (f != nullptr && name != f.name())
        f = f.next();
      return f;
    }
    
    FlagList.SetFlagsFromCommandLine = function(argc, argv, remove_flags) {
      for (let i = 0; i < argc;) {
        let j = i;
        
        let arg = argv[i++];
        let { name, value, is_bool } = this.SplitArgument(arg);
        
        if (name != null) {
          let flag = this.Lookup(name);
          if (flag == nullptr) {
            if (remove_flags) {
              continue;
            } else {
              console.error("Error: unrecognized flag " + arg + "\n");
              return j;
            }
          }
          
          if (flag.type() != Flag.Type.BOOL && value == null) {
            if (i < argc) {
              value = argv[i++];
            } else {
              console.error("Error: missing value for flag " + arg + " of type " + Type2String(flag.type()) + "\n");
              return j;
            }
          }
          
          switch (flag.type()) {
            case Flag.Type.BOOL:
              flag.bool_variable(!is_bool);
              break;
            case Flag.Type.INT:
              flag.int_variable(parseInt(value));
              break;
            case Flag.Type.FLOAT:
              flag.float_variable(parseFloat(value));
              break;
            case Flag.Type.STRING:
              flag.string_variable(value);
              break;
          }
          
          if ((flag.type() == Flag.Type.BOOL && value != null)
                || (flag.type() != Flag.Type.BOOL && is_bool)) {
            console.error("Error: illegal value for flag " + arg + " of type " + Type2String(flag.type()) + "\n");
            return j;
          }
          
          if (remove_flags)
            while (j < i)
              argv[j++] = null;
        }
      }
      
      if (remove_flags) {
        let j = 0;
        for (let i = 0; i < argc; i++) {
          if (argv[i] != null)
            argv[j++] = argv[i];
        }
        argc = j;
      }
      
      return 0;
    }
    
    FlagList.SplitArgument = function(arg) {
      let name = null;
      let value = null;
      let is_bool = false;
      
      let arg_arr = arg.split("=");
      name = arg_arr.length == 0 ? null : arg_arr[0].trim();
      value = arg_arr.length < 2 ? null : arg_arr[1].trim();
      
      if (name && name.charAt(0) == "-")
        if (name.charAt(1) == "-")
          name = name.substr(2);
        else
          name = name.substr(1);
      
      if (name == "no")
        is_bool = true;
      
      return { name, value, is_bool };
    }
    
    $[2](FlagList, {
      list_: $.type(Flag, "*")
    });
    
    internal.export({ FlagList });

    function V8() {
      $[0](this, ...arguments);
    }
    
    V8.Initialize = function(des) {
      let create_heap_objects = (des == null);
      
      if (this.HasBeenDisposed()) return false;
      if (this.HasBeenSetup()) return true;
      this.has_been_setup_ = true;
      
      Logger.Setup();
      if (des != null)
        des.GetLog();
        
      CPU.Setup();
      OS.Setup();
      
      if (!Heap.Setup(create_heap_objects)) {
        this.has_been_setup_ = false;
        return false;
      }
      
      return true;
    };
    
    V8.HasBeenSetup = function() {
      return this.has_been_setup_;
    };
    
    V8.HasBeenDisposed = function() {
      return this.has_been_disposed_;
    };
    
    V8.has_been_setup_ = false;
    V8.has_been_disposed_ = false;

    function Snapshot() {
      $[0](this, ...arguments);
    }
    
    Snapshot.Initialize = function(snapshot_file = null) {
      if (snapshot_file) {
        throw new Error("unimplemented");
      } else if (this.size_ > 0) {
        throw new Error("unimplemented");
      }
      return false;
    }

    $[2](Snapshot, {
      size_: $.i32
    });
    
    internal.export({ Snapshot });

    class Logger {
      static Setup() {
        return false;
      }
    }
    
    class CPU {
      static Setup() {
        // nothing to do
      }
    }
    
    class OS {
      static Setup() {
        // nothing to do
      }
    }

    class Page {
      Page() { }
      
      constructor(...args) {
        $[0](this, ...args);
      }

      static {
        $[2](this, {
          kPageSizeBits: $.i32,
          kPageSize: $.i32,
          kPageAlignmentMask: $.i32
        });
      }
    }

    Page.kPageSizeBits = 13;
    Page.kPageSize = 1 << Page.kPageSizeBits;
    Page.kPageAlignmentMask = (1 << Page.kPageSizeBits) - 1;
    
    class Malloced {
      static New(size) {
        return voidptr(alloc(size));
      }
      
      static Delete(ptr) {
        free(ptr);
      }
    }
    
    class FreeStoreAllocationPolicy {
      static New(size) {
        return Malloced.New(size);
      }
      
      static Delete(ptr) {
        return Malloced.Delete(ptr);
      }
    }
    
    function ChunkInfo() {
      $[0](this, ...arguments);
    }
    
    ChunkInfo[_].ChunkInfo = function() {
      
    };
    
    ChunkInfo[_].init = function(a, s, o) {
      this.address_ = a;
      this.size_ = s;
      this.owner_ = o;
    };
    
    struct(ChunkInfo[_], {
      address_: $.u8ptr,
      size_: $.i32,
      owner_: $.i32ptr //owner_ PagedSpace pointer.
    });

    const List = new (function List() { });

    List["ChunkInfo"] = function List() {
      $[0](this, ...arguments);
    };

    List["ChunkInfo"][_].List = function(capacity) {
      this.Initialize(capacity);
    };

    List["ChunkInfo"][_].Initialize = function(capacity) {
      this.data_ = (capacity > 0) ? this.NewData(capacity) : NULL;
      this.capacity_ = capacity;
      this.length_ = 0;
    };

    List["ChunkInfo"][_].NewData = function(n) {
      return FreeStoreAllocationPolicy.New(n * sizeOf(ChunkInfo));
    };

    List["ChunkInfo"][_].Add = function(element) {
      if (this.length_ >= this.capacity_) {
        throw new Error("Unimplemented List[ChunkInfo]");
      }
      let index = this.length_.valueOf();
      this.length_ = index + 1;
      return this.data_.put(index, element);
    };

    struct(List["ChunkInfo"][_], {
      data_: $.ptr(ChunkInfo),
      capacity_: $.i32,
      length_: $.i32
    });

    List["int"] = function List() {
      $[0](this, ...arguments);
    };

    List["int"][_].List = function(capacity) {
      this.Initialize(capacity);
    };

    List["int"][_].Initialize = function(capacity) {
      this.data_ = (capacity > 0) ? this.NewData(capacity) : NULL;
      this.capacity_ = capacity;
      this.length_ = 0;
    };

    List["int"][_].NewData = function(n) {
      return FreeStoreAllocationPolicy.New(n * 4);
    };

    List["int"][_].Add = function(element) {
      if (this.length_ >= this.capacity_) {
        throw new Error("Unimplemented List[int]");
      }
      let index = this.length_.valueOf();
      this.length_ = index + 1;
      return this.data_.put(index, element);
    }

    struct(List["int"][_], {
      data_: $.i32ptr,
      capacity_: $.i32,
      length_: $.i32
    });

    function MemoryAllocator() {
      $[0](this, ...arguments);
    }
    
    MemoryAllocator.ChunkInfo = ChunkInfo;
      
    MemoryAllocator.Setup = function(capacity) {
      this.capacity_ = RoundUp(capacity, Page.kPageSize);

      this.max_nof_chunks_ = (this.capacity_ / (this.kChunkSize - Page.kPageSize)) + 5;

      if (this.max_nof_chunks_ > this.kMaxNofChunks) return false;

      this.size_ = 0;
      
      let info = new this.ChunkInfo();
      for (let i = this.max_nof_chunks_ - 1; i >= 0; i--) {
        this.chunks_.Add(info);
        this.free_chunk_ids_.Add(i);
      }
      this.top_ = this.max_nof_chunks_;
      //console.log(this.capacity_, this.max_nof_chunks_, this.kChunkSize);
      return true;
    }
      
    $[2](MemoryAllocator, {
        kMaxNofChunks: $.i32,
        kPagesPerChunk: $.i32,
        kChunkSize: $.i32,
        capacity_: $.i32,
        size_: $.i32,
        
        chunks_: $.type(List["ChunkInfo"]),
        free_chunk_ids_: $.type(List["int"]),
        max_nof_chunks_: $.i32,
        top_: $.i32
    });
    
    MemoryAllocator.kMaxNofChunks = 1 << Page.kPageSizeBits;
    MemoryAllocator.kPagesPerChunk = 64;
    MemoryAllocator.kChunkSize = MemoryAllocator.kPagesPerChunk * Page.kPageSize;
    
    const kEstimatedNumberOfChunks = 1049; //270;
    MemoryAllocator.chunks_ = new List["ChunkInfo"]([kEstimatedNumberOfChunks]);
    MemoryAllocator.free_chunk_ids_ = new List["int"]([kEstimatedNumberOfChunks]);
    
    function NewSpace() {
      $[0](this, ...arguments);
    }
    
    function OldSpace() {
      $[0](this, ...arguments);
    }
    
    function MapSpace() {
      $[0](this, ...arguments);
    }
    
    function LargeObjectSpace() {
      $[0](this, ...arguments);
    }

    let FLAG_new_space_size = 0;
    let FLAG_old_space_size = 0;
    
    let heap_configured = false;

    const Heap = new (function Heap() {});
    Heap.HasBeenSetup = function() {
      return !this.new_space_.isNullptr() &&
        !this.old_space_.isNullptr() &&
        !this.code_space_.isNullptr() &&
        !this.map_space_.isNullptr() &&
        !this.lo_space_.isNullptr();
    }
      
    Heap.ConfigureHeap = function(semispace_size, old_gen_size) {
      if (this.HasBeenSetup()) return false;
      
      if (semispace_size > 0) this.semispace_size_ = semispace_size;
      if (old_gen_size > 0) this.old_generation_size_ = old_gen_size;
      
      this.semispace_size_ = RoundUpToPowerOf2(this.semispace_size_);
      this.initial_semispace_size_ = Min(this.initial_semispace_size_, this.semispace_size_);
      this.young_generation_size_ = 2 * this.semispace_size_;
      
      this.old_generation_size_ = RoundUp(this.old_generation_size_, Page.kPageSize);

      heap_configured = true;
      return true;
    }
      
    Heap.ConfigureHeapDefault = function() {
      return this.ConfigureHeap(FLAG_new_space_size, FLAG_old_space_size);
    }
      
    Heap.Setup = function(create_heap_objects) {
      if (!heap_configured) {
        if (!this.ConfigureHeapDefault()) return false;
      }

      if (!MemoryAllocator.Setup(this.MaxCapacity())) return false;
      
      return true;
    }

    Heap.MaxCapacity = function() {
      return this.young_generation_size_ + this.old_generation_size_;
    }
    
    $[2](Heap, {
      semispace_size_: $.i32,
      initial_semispace_size_: $.i32,
      young_generation_size_: $.i32,
      old_generation_size_: $.i32,
      
      new_space_growth_limit_: $.i32,
      scavenge_count_: $.i32,
      kMaxMapSpaceSize: $.i32,
      
      new_space_: $.ptr(NewSpace),
      old_space_: $.ptr(OldSpace),
      code_space_: $.ptr(OldSpace),
      map_space_: $.ptr(MapSpace),
      lo_space_: $.ptr(LargeObjectSpace)
    });

    Heap.kMaxMapSpaceSize = 8*MB;
    Heap.semispace_size_  = 1*MB;
    Heap.old_generation_size_ = 512*MB;
    Heap.initial_semispace_size_ = 256*KB;

    
    
    internal.export({ V8, Page, MemoryAllocator });
    v8.export({ internal });
  }); // namespace internal

  const i = internal;
  
  class Utils {
    static ReportApiFailure(location, message) {
      let callback = GetFatalErrorHandler();
      callback(location, message);
      has_shut_down = true;
      return false;
    }
  }

  const API_FATAL = (location, message, ...args) => {
    let message_arr = ["\n#\n# Fatal error in " + location + "\n# "];
    message_arr.push(args.length > 0 ? args[0] : "");
    message_arr.push("\n#\n\n");
    throw new Error(message_arr.join(""));
  };
  
  let has_shut_down = false;
  let exception_behavior = null;
  
  const DefaultFatalErrorHandler = (location, message) => {
    API_FATAL(location, message);
  };

  const GetFatalErrorHandler = () => {
    if (exception_behavior == null) {
      exception_behavior = DefaultFatalErrorHandler;
    }
    return exception_behavior;
  };
  
  const ApiCheck = (condition, location, message) => {
    return condition ? true : Utils.ReportApiFailure(location, message);
  };
  
  const ReportV8Dead = (location) => {
    let callback = GetFatalErrorHandler();
    callback(location, "V8 is no longer useable");
    return true;
  };

  const IsDeadCheck = (location) => {
    return has_shut_down ? ReportV8Dead(location) : false;
  };
  
  const EnsureInitialized = (location) => {
    if (IsDeadCheck(location)) return;
    ApiCheck(v8.V8.Initialize(), location, "Error initializing V8");
  };

  const Handle = new (function Handle() {});
  Handle["FunctionTemplate"] = function Handle() {
    $[0](this, ...arguments);
  };

  Handle["ObjectTemplate"] = function Handle() {
    $[0](this, ...arguments);
  };

  const Local = new (function Local() {});
  Local["FunctionTemplate"] = function Local() {
    $[0](this, ...arguments);
  };

  Local["ObjectTemplate"] = function Local() {
    $[0](this, ...arguments);
  };

  class V8 {
    static SetFlagsFromCommandLine(argc, argv, remove_flags) {
      i.FlagList.SetFlagsFromCommandLine(argc, argv, remove_flags);
    }
    
    static Initialize() {
      if (i.V8.HasBeenSetup()) return true;
      let scope = new HandleScope();
      if (i.Snapshot.Initialize()) {
        i.Serializer.disable();
        return true;
      } else {
        return i.V8.Initialize(null);
      }
    }
  }

  v8.export({ V8 });

  class HandleScope {
    static Data = class Data {
      Initialize() {
        this.extensions = -1;
        this.next = this.limit = nullptr;
      }
      
      constructor(...args) {
        $[0](this, ...args);
      }

      static {
        $[1](this.prototype, {
          extensions: $.i32
        });
      }
    }
    
    HandleScope() {
      this.previous_ = HandleScope.current_;
      this.is_closed_ = false;
      HandleScope.current_.extensions = 0;
    }
    
    constructor(...args) {
      $[0](this, ...args);
    }

    static {
      $[1](this.prototype, {
        previous_: $.type(HandleScope.Data),
        is_closed_: $.bool
      });
      $[2](this, {
        current_: $.type(this.Data)
      });
    }
  }

  class Data {
    constructor() {
      $[0](this, ...arguments);
    }
  }

  class Template extends Data {
    constructor() {
      super(...arguments);
    }
  }

  class FunctionTemplate extends Template {
    constructor() {
      super(...arguments);
    }
  }

  class ObjectTemplate extends Template {
    static New(constructor) {
      if (constructor == undefined)
        constructor = new Local["FunctionTemplate"]();
      if (IsDeadCheck("v8::ObjectTemplate::New()"))
        return new Local["ObjectTemplate"]();
      EnsureInitialized("v8::ObjectTemplate::New()");
    }
    
    constructor() {
      super(...arguments);
    }
  }

  v8.export({ ObjectTemplate });
  
  v8.export({ Handle, HandleScope });
}); // namespace v8

const main = (args) => {
  v8.V8.SetFlagsFromCommandLine(args.length, args, true);
  let handle_scope = new v8.HandleScope([]);
  let global = v8.ObjectTemplate.New();
  console.log(handle_scope, global);
};

main([]);