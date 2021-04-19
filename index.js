(function(global) {
    "use strict";
    // javascript implementation of namespaces
    function namespace_(names) {
        var space = Object.create(null);
        for(var name in names)
            space[name] = names[name];
        return space;
    }

    function Min(a,b) {
        return Math.min(a,b);
    }

    // v8 namespace 
    global.v8 = namespace_({
        // internal namespace
        internal : namespace_({
            Utf16CharacterStream : null,
            BufferedCharacterStream : null,
            Token : null,
            Scanner : null,
            Parser : null
        })
    });

    // using i = v8::internal from common/globals.h
    var i = v8.internal;

    // implementation of i::CopyCharsUnsigned in util/utils.h
    (function() {
        // implementation was completely different from the original c++ code
        // instead of memory copy which is not supported in javascript
        // this implementation copies only the values from 
        // the source array to destination array
        function CopyCharsUnsigned(dest,source,length) {
            var index = 0;

            while(index < length) {
                dest[index] = source[index].charCodeAt(0);
                index++;
            }
        }

        var MessageTemplate = {
            kNone : 0
        };

        v8.internal.CopyCharsUnsigned = CopyCharsUnsigned;
        v8.internal.MessageTemplate = MessageTemplate;
    })();

    (function() {
        function String(string) {
            var chars = (string ? string.split("") : []);
            this.GetChars = function() {
                return chars;
            }
        }
        v8.internal.String = String;
    })();

    (function() {
        // Javascript version of v8::internal::Utf16CharacterStream at scanner.h
        function Utf16CharacterStream(buffer_start, buffer_cursor, buffer_end, buffer_pos) {
            this.buffer_start_ = buffer_start;
            this.buffer_cursor_ = buffer_cursor;
            this.buffer_end_ = buffer_end;
            this.buffer_pos_ = buffer_pos;
            this.has_parser_error = false;
        }

        var kEndOfInput = Utf16CharacterStream.kEndOfInput = -1;
        Utf16CharacterStream.prototype.Peek = function() {
            // Checks if buffer_cursor is still less than buffer_end 
            // if isn't ReadBlockChecked will be invoked to load new characters in buffer
            if(this.buffer_cursor_ < this.buffer_end_)
                return this.buffer_[this.buffer_cursor_];
            else if(this.ReadBlockChecked())
                return this.buffer_[this.buffer_cursor_];
            else
                return kEndOfInput;
        };
        // returns the current character on buffer indexed by buffer_cursor_
        Utf16CharacterStream.prototype.Advance = function() {
            var result = this.Peek();
            this.buffer_cursor_++;
            return result;
        }
        Utf16CharacterStream.prototype.AdvanceUntil = function(check) {
            while(true) {
                var next_cursor_pos = this.buffer_end_;
                while(this.buffer_cursor_ < this.buffer_end_) {
                    if(check(this.buffer_[this.buffer_cursor_])) {
                        next_cursor_pos = this.buffer_cursor_;
                        break;
                    }
                    this.buffer_cursor_++;
                }

                if(next_cursor_pos == this.buffer_end_) {
                    this.buffer_cursor_ = this.buffer_end_;
                    if(!this.ReadBlockChecked()) {
                        this.buffer_cursor_++;
                        return kEndOfInput;
                    }
                }
                else {
                    this.buffer_cursor_ = next_cursor_pos + 1;
                    return this.buffer_[next_cursor_pos];
                }

            }
        }
        Utf16CharacterStream.prototype.Back = function() {
            if(this.buffer_cursor_ > this.buffer_start_)
                this.buffer_cursor_--;
            else
                this.ReadBlockAt(this.pos() - 1);
        };
        // Returns the current position on our character stream
        Utf16CharacterStream.prototype.pos = function() {
            return this.buffer_pos_ + (this.buffer_cursor_ - this.buffer_start_);
        };
        Utf16CharacterStream.prototype.Seek = function(pos) {
            if(pos > this.buffer_pos_ && 
               pos < (this.buffer_pos_ + (this.buffer_end_ - this.buffer_start_)))
                this.buffer_cursor_ + (pos - this.buffer_pos_);
            else
                this.ReadBlockAt(pos);
        };

        Utf16CharacterStream.prototype.ReadBlockChecked = function() {
            return !this.has_parser_error && this.ReadBlock();
        };
        Utf16CharacterStream.prototype.ReadBlockAt = function(new_pos) {
            this.buffer_pos_ = new_pos;
            this.buffer_cursor_ = this.buffer_start_;
            this.ReadBlockChecked();
        };

        v8.internal.Utf16CharacterStream = Utf16CharacterStream;
    })();

    (function() {
        function Range() {
            this.start = 0;
            this.end = 0;
            this._chars;
        }
        Range.prototype = {
            constructor : Range,
            length : function() {
                return this.end - this.start;
            }
        };
        v8.internal.Range = Range;

        function OnHeapStream(string,start_offset,end) {
            this.string_ = string;
            this.start_offset_ = start_offset;
            this.length_ = end;
        }
        OnHeapStream.prototype = {
            constructor : OnHeapStream,
            GetDataAt : function(pos) {
                var range = new Range();
                range.start = this.start_offset_ + Min(this.length_,pos);
                range.end = this.start_offset_ + this.length_;
                range.start_ = this.string_.GetChars().slice(range.start);
                return range;
            }
        };
        v8.internal.OnHeapStream = OnHeapStream;

        function BufferedCharacterStream(ByteStream, pos, string, start_offset, end) {
            this.byte_stream_ = new ByteStream(string,start_offset,end);
            this.buffer_pos_ = pos;
            this.buffer_ = new Array(BufferedCharacterStream.kBufferSize);
            this.buffer_start_ = 0;
            this.buffer_cursor_ = 0;
            this.buffer_end_ = 0;
        }
        var kBufferSize = BufferedCharacterStream.kBufferSize = 512;
        BufferedCharacterStream.prototype = Object.create(v8.internal.Utf16CharacterStream.prototype);
        BufferedCharacterStream.prototype.constructor = BufferedCharacterStream;
        BufferedCharacterStream.prototype.ReadBlock = function() {
            var position = this.pos();
            this.buffer_pos_ = position;
            this.buffer_start_ = 0;
            this.buffer_cursor_ = 0;

            var range = this.byte_stream_.GetDataAt(position);
            if(range.length() == 0) {
                this.buffer_end_ = this.buffer_start;
                return false;
            }

            var length = Min(kBufferSize, range.length());
            i.CopyCharsUnsigned(this.buffer_, range.start_,length);
            this.buffer_end_ = length;
            return true;
        }
        

        v8.internal.BufferedCharacterStream = BufferedCharacterStream;
    })();

    (function() {
        function Scanner(source, is_module) {
            this.source_ = source;
            this.is_module_ = is_module;
            this.c0_ = -1;
            this.token_storage = new Array(3);
            this.found_html_comment = false;

            this.current_ = undefined;
            this.next_ = undefined;
            this.next_next_ = undefined;

            this.allow_harmony_optional_chaining_ = false;
            this.allow_harmony_nullish_ = false;

            this.octal_pos_ = Location.invalid();
            this.octal_message_ = MessageTemplate.kNone;
        }

        function Location(b, e) {
            this.beg_pos = b;
            this.end_pos = e;
        }

        Location.prototype.length = function() {
            return this.end_pos - this.beg_pos;
        }

        Location.invalid = function() {
            return new Location(-1, 0);
        }

        Scanner.prototype.Init = function() {
            this.Advance();
            this.current_ = 0;
            this.next_ = 1;
            this.next_next_ = 2;
            this.found_html_comment = false;
            this.scanner_error = MessageTemplate.kNone;
        }

        Scanner.prototype.Advance = function() {
            this.c0_ = this.source_.Advance();
        }

        Scanner.prototype.Peek = function() {

        }

        Scanner.prototype.Initialize = function() {
            this.Init();
        }

        Scanner.prototype.Next = function() {

        }

        Scanner.prototype.PeekAhead = function() {

        }

        Scanner.prototype.current_token = function() {

        }

        Scanner.prototype.peek = function() {

        }

        v8.internal.Scanner = Scanner;
    })();

})(this);
